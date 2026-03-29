/**
 * TTS Narration Generator Edge Function
 * ======================================
 * Generates audio narration for module pages using OpenAI gpt-4o-mini-tts.
 *
 * Narration texts are pre-extracted during module generation and stored
 * in narration_data[].fullText on the modules/module_variants table.
 * This function reads those texts and generates audio via OpenAI TTS.
 *
 * Request body:
 *   { moduleId: string, variantId?: string, pages?: number[], force?: boolean }
 *
 * Flow:
 *   1. Read narration_data from module (pre-extracted texts from generation)
 *   2. Call OpenAI TTS API for each page with text
 *   3. Upload audio to Supabase Storage (tts-audio bucket)
 *   4. Update narration_data with audio URLs and status
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// OpenAI TTS config
const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const TTS_MODEL = "gpt-4o-mini-tts";
const TTS_VOICE = "ash";
const TTS_INSTRUCTIONS = "Young Australian male energy, happy, upbeat, warm, playful, child-friendly, clear pronunciation, natural pacing, never babyish, sounds like an encouraging guide for children. Speak at a brisk but clear pace — not slow, not rushed.";

interface NarrationEntry {
  pageIndex: number;
  text: string;
  fullText?: string;
  audioUrl: string | null;
  contentHash: string | null;
  status: string;
  error?: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/**
 * Call OpenAI TTS API to generate audio for text.
 */
async function generateAudio(
  text: string,
  apiKey: string,
  voice: string = TTS_VOICE,
  instructions: string = TTS_INSTRUCTIONS,
): Promise<ArrayBuffer> {
  const response = await fetch(OPENAI_TTS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice,
      input: text,
      instructions,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`OpenAI TTS error ${response.status}: ${errorBody}`);
  }

  return response.arrayBuffer();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  console.log("[TTS] ====== generate-narration (OpenAI) called ======");

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.error("[TTS] OPENAI_API_KEY is not set!");
    return jsonResponse({ error: "OPENAI_API_KEY not configured" }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { moduleId, variantId, pages: requestedPages, force = false } = body;
    console.log("[TTS] Request:", JSON.stringify({ moduleId, variantId, force, pages: requestedPages }));

    if (!moduleId) {
      return jsonResponse({ error: "moduleId is required" }, 400);
    }

    // 1. Load the module
    const { data: mod, error: modError } = await supabaseClient
      .from("modules")
      .select("id, title, code, narration_data, narration_status")
      .eq("id", moduleId)
      .single();

    if (modError || !mod) {
      console.error("[TTS] Module not found:", modError?.message);
      return jsonResponse({ error: "Module not found" }, 404);
    }
    console.log("[TTS] Module:", mod.title, "| code:", mod.code);

    // 2. Determine target table and get narration data
    let targetTable: string;
    let targetId: string;
    let existingNarration: NarrationEntry[];
    let storagePath: string;

    if (variantId) {
      const { data: variant, error: varError } = await supabaseClient
        .from("module_variants")
        .select("id, age_band, narration_data")
        .eq("id", variantId)
        .single();

      if (varError || !variant) {
        console.error("[TTS] Variant not found:", varError?.message);
        return jsonResponse({ error: "Variant not found" }, 404);
      }
      targetTable = "module_variants";
      targetId = variantId;
      existingNarration = variant.narration_data || [];
      storagePath = `${mod.code || moduleId}/${variant.age_band || variantId}`;
    } else {
      targetTable = "modules";
      targetId = moduleId;
      existingNarration = mod.narration_data || [];
      storagePath = mod.code || moduleId;
    }

    console.log("[TTS] Target:", targetTable, targetId, "| Pages:", existingNarration?.length || 0);

    // 3. If no narration texts OR force=true, re-extract fresh from HTML
    if (!existingNarration || existingNarration.length === 0 || force) {
      console.log("[TTS] Extracting narration text fresh from HTML...");

      const htmlTable = variantId ? "module_variants" : "modules";
      const { data: htmlRecord } = await supabaseClient
        .from(htmlTable)
        .select("html_content")
        .eq("id", targetId)
        .single();

      if (!htmlRecord?.html_content) {
        return jsonResponse({ error: "Module has no HTML content and no narration texts" }, 400);
      }

      const htmlContent = htmlRecord.html_content as string;
      const extractedPages: string[] = [];

      const funcRegex = /function\s+generatePage\d+\(\)\s*\{\s*return\s*`([\s\S]*?)`;\s*\}/g;
      let funcMatch;
      while ((funcMatch = funcRegex.exec(htmlContent)) !== null) {
        const pageHtml = funcMatch[1];
        let text = pageHtml;
        text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
        text = text.replace(/<canvas[\s\S]*?<\/canvas>/gi, '');
        text = text.replace(/<button[\s\S]*?<\/button>/gi, '');
        text = text.replace(/<(?:input|textarea)[^>]*\/?>/gi, '');
        text = text.replace(/<label[\s\S]*?<\/label>/gi, '');
        // Remove feedback/hidden elements — match opening tag through to its balanced </div>
        // These contain nested tags so we can't use simple [\s\S]*?<\/tag> — use a greedy match to the LAST </div> in the block
        const feedbackClasses = /quiz-feedback|scenario-feedback|followup-feedback|mascot-feedback|m-feedback-hidden|m-bg-light-green/;
        text = text.replace(/<div[^>]*class="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi, (match, cls) => {
          return feedbackClasses.test(cls) ? '' : match;
        });
        // Also catch <p> feedback elements (quiz-feedback is a <p>)
        text = text.replace(/<p[^>]*class="[^"]*(?:quiz-feedback|scenario-feedback)[^"]*"[^>]*>[\s\S]*?<\/p>/gi, '');
        // Remove display:none elements
        text = text.replace(/<[^>]+style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/(?:div|p|span)>/gi, '');
        text = text.replace(/\s*data-feedback="[^"]*"/gi, '');
        text = text.replace(/\s*data-correct="[^"]*"/gi, '');
        text = text.replace(/\s*data-good="[^"]*"/gi, '');
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<\/(?:p|h[1-6]|div|li|blockquote)>/gi, '\n');
        text = text.replace(/<[^>]+>/g, ' ');
        text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        text = text.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ');
        text = text.replace(/\$\{[^}]+\}/g, '');
        text = text.replace(/\\`/g, '`').replace(/\\\\/g, '\\');
        text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
        const skipPatterns = /^(I finished|I completed|I practiced|I thought about|Breaths completed|\/\s*\d+)$/i;
        const cleaned = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 2 && !skipPatterns.test(l)).join(' ').replace(/\s+/g, ' ').trim();
        extractedPages.push(cleaned);
      }

      if (extractedPages.length === 0) {
        return jsonResponse({ error: "Could not extract narration text from module HTML" }, 400);
      }

      console.log(`[TTS] Extracted text from ${extractedPages.length} pages`);

      existingNarration = extractedPages.map((text, i) => ({
        pageIndex: i,
        text: text.slice(0, 200) + (text.length > 200 ? '...' : ''),
        fullText: text,
        audioUrl: null,
        contentHash: null,
        status: 'pending' as const,
      }));

      await supabaseClient
        .from(targetTable)
        .update({ narration_data: existingNarration })
        .eq("id", targetId);
    }

    // 4. Mark as generating
    await supabaseClient
      .from(targetTable)
      .update({ narration_status: "generating" })
      .eq("id", targetId);

    // 5. Process pages in parallel batches of 5 for speed
    const PARALLEL_BATCH = 5;
    const narrationData: NarrationEntry[] = [...existingNarration];
    let hasErrors = false;
    let pagesGenerated = 0;
    const pagesToProcess = requestedPages || existingNarration.map((_: NarrationEntry, i: number) => i);

    // Build list of pages that actually need generation
    const workItems: { i: number; text: string; hash: string }[] = [];
    for (let i = 0; i < existingNarration.length; i++) {
      if (!pagesToProcess.includes(i)) continue;
      const entry = existingNarration[i];
      const narrationText = entry.fullText || entry.text || "";
      if (narrationText.length < 20) {
        narrationData[i] = { ...entry, audioUrl: null, status: "skipped" };
        continue;
      }
      const textToSpeak = narrationText.length > 4000
        ? narrationText.slice(0, 4000) + "..."
        : narrationText;
      const contentHash = await hashText(textToSpeak);
      if (!force && entry.audioUrl && entry.contentHash === contentHash && entry.status === "ready") {
        continue;
      }
      workItems.push({ i, text: textToSpeak, hash: contentHash });
    }

    console.log(`[TTS] ${workItems.length} pages to generate (parallel batch size: ${PARALLEL_BATCH})`);

    // Process in parallel batches
    for (let b = 0; b < workItems.length; b += PARALLEL_BATCH) {
      const batch = workItems.slice(b, b + PARALLEL_BATCH);
      console.log(`[TTS] Batch ${Math.floor(b / PARALLEL_BATCH) + 1}: pages ${batch.map(w => w.i).join(', ')}`);

      const results = await Promise.allSettled(batch.map(async (work) => {
        const { i, text, hash } = work;
        const entry = existingNarration[i];
        const narrationText = entry.fullText || entry.text || "";

        const audioBuffer = await generateAudio(text, apiKey);
        const fileName = `${storagePath}/page-${i}.mp3`;
        const { error: uploadError } = await supabaseClient.storage
          .from("tts-audio")
          .upload(fileName, audioBuffer, { contentType: "audio/mpeg", upsert: true });
        if (uploadError) throw new Error(`Storage upload: ${uploadError.message}`);

        const { data: urlData } = supabaseClient.storage
          .from("tts-audio")
          .getPublicUrl(fileName);

        return { i, narrationText, hash, audioUrl: urlData.publicUrl };
      }));

      // Process results
      for (let r = 0; r < results.length; r++) {
        const result = results[r];
        const work = batch[r];
        const entry = existingNarration[work.i];
        const narrationText = entry.fullText || entry.text || "";

        if (result.status === "fulfilled") {
          const { i, hash, audioUrl } = result.value;
          narrationData[i] = {
            pageIndex: i,
            text: narrationText.slice(0, 200) + (narrationText.length > 200 ? "..." : ""),
            fullText: narrationText,
            audioUrl,
            contentHash: hash,
            status: "ready",
          };
          pagesGenerated++;
        } else {
          hasErrors = true;
          narrationData[work.i] = {
            pageIndex: work.i,
            text: narrationText.slice(0, 200) + "...",
            fullText: narrationText,
            audioUrl: null,
            contentHash: work.hash,
            status: "error",
            error: result.reason?.message || String(result.reason),
          };
          console.error(`[TTS] Page ${work.i} error:`, result.reason);
        }
      }

      // Save progress after each batch
      await supabaseClient
        .from(targetTable)
        .update({ narration_data: narrationData, narration_status: "generating" })
        .eq("id", targetId);
    }

    // 6. Final save
    const allReady = narrationData.every(n => n.status === "ready" || n.status === "skipped");
    const finalStatus = allReady ? "ready" : hasErrors ? "error" : "ready";

    await supabaseClient
      .from(targetTable)
      .update({ narration_data: narrationData, narration_status: finalStatus })
      .eq("id", targetId);

    const readyCount = narrationData.filter(n => n.status === "ready").length;
    const skippedCount = narrationData.filter(n => n.status === "skipped").length;
    const errorCount = narrationData.filter(n => n.status === "error").length;

    console.log(`[TTS] DONE — Ready: ${readyCount} | Skipped: ${skippedCount} | Errors: ${errorCount}`);

    return jsonResponse({
      success: true,
      moduleId,
      variantId: variantId || null,
      totalPages: existingNarration.length,
      readyCount,
      skippedCount,
      errorCount,
      narrationStatus: finalStatus,
    });

  } catch (err) {
    console.error("[TTS] FATAL:", err);
    return jsonResponse({
      error: err instanceof Error ? err.message : "Internal server error",
    }, 500);
  }
});
