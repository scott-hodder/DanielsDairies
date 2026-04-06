/**
 * TTS Narration Generator Edge Function
 * ======================================
 * Generates audio narration for module pages.
 * Supports two TTS providers:
 *   - Voicebox (voicebox.sh) — self-hosted, custom voice cloning (preferred)
 *   - OpenAI gpt-4o-mini-tts — cloud fallback
 *
 * Set VOICEBOX_URL and VOICEBOX_PROFILE_ID env vars to use Voicebox.
 * Falls back to OpenAI if Voicebox is not configured.
 *
 * Request body:
 *   { moduleId: string, variantId?: string, pages?: number[], force?: boolean }
 *
 * Flow:
 *   1. Read narration_data from module (pre-extracted texts from generation)
 *   2. Call TTS API (Voicebox or OpenAI) for each page with text
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

// OpenAI TTS config (fallback)
const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const TTS_MODEL = "gpt-4o-mini-tts";
const TTS_VOICE = "ash";
const TTS_INSTRUCTIONS = "Young Australian male energy, happy, upbeat, warm, playful, child-friendly, clear pronunciation, natural pacing, never babyish, sounds like an encouraging guide for children. Speak at a brisk but clear pace — not slow, not rushed.";

// Voicebox config (preferred when available)
const VOICEBOX_INSTRUCT = "Warm, friendly, encouraging Australian voice for children. Clear pronunciation, natural pacing, upbeat and engaging.";

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
 * Determine which TTS provider to use.
 */
function getTtsProvider(): { provider: "voicebox" | "openai"; voiceboxUrl?: string; profileId?: string } {
  const voiceboxUrl = Deno.env.get("VOICEBOX_URL");
  const profileId = Deno.env.get("VOICEBOX_PROFILE_ID");
  if (voiceboxUrl && profileId) {
    return { provider: "voicebox", voiceboxUrl, profileId };
  }
  return { provider: "openai" };
}

/**
 * Call Voicebox API to generate audio for text.
 * Returns audio as ArrayBuffer (WAV format, converted to MP3-compatible upload).
 */
async function generateAudioVoicebox(
  text: string,
  voiceboxUrl: string,
  profileId: string,
): Promise<ArrayBuffer> {
  // Generate speech via Voicebox REST API
  const response = await fetch(`${voiceboxUrl}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
    body: JSON.stringify({
      profile_id: profileId,
      text,
      language: "en",
      instruct: VOICEBOX_INSTRUCT,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`Voicebox TTS error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  const generationId = result.id;

  if (!generationId) {
    throw new Error("Voicebox returned no generation id");
  }

  // Poll until generation is complete (status changes from "generating")
  // CPU inference can be slow — allow up to 5 minutes per page
  const maxAttempts = 150;
  const pollInterval = 2000; // 2 seconds
  let completed = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusRes = await fetch(`${voiceboxUrl}/history/${generationId}`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    if (!statusRes.ok) {
      throw new Error(`Voicebox status check error ${statusRes.status}`);
    }

    const statusData = await statusRes.json();
    if (attempt % 5 === 0) {
      console.log(`[Voicebox] Poll ${attempt + 1}: status=${statusData.status}, audio_path=${statusData.audio_path || "(empty)"}, duration=${statusData.duration}`);
    }

    if (statusData.status === "error" || statusData.status === "failed" || statusData.error) {
      throw new Error(`Voicebox generation failed: ${statusData.error || "unknown error"}`);
    }

    // Wait until audio_path is populated — status can show "completed" before the file is ready
    if (statusData.audio_path && statusData.duration > 0) {
      completed = true;
      break;
    }
  }

  if (!completed) {
    throw new Error("Voicebox generation timed out");
  }

  // Fetch the generated audio file by generation ID
  const audioUrl = `${voiceboxUrl}/audio/${generationId}`;
  const audioResponse = await fetch(audioUrl, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  if (!audioResponse.ok) {
    throw new Error(`Voicebox audio fetch error ${audioResponse.status}`);
  }

  return audioResponse.arrayBuffer();
}

/**
 * Call OpenAI TTS API to generate audio for text.
 */
async function generateAudioOpenAI(
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

/**
 * Generate audio using the configured TTS provider.
 */
async function generateAudio(
  text: string,
  apiKey: string,
  ttsProvider: ReturnType<typeof getTtsProvider>,
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  if (ttsProvider.provider === "voicebox") {
    const buffer = await generateAudioVoicebox(text, ttsProvider.voiceboxUrl!, ttsProvider.profileId!);
    return { buffer, contentType: "audio/wav" };
  }
  const buffer = await generateAudioOpenAI(text, apiKey);
  return { buffer, contentType: "audio/mpeg" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  const ttsProvider = getTtsProvider();
  console.log(`[TTS] ====== generate-narration (${ttsProvider.provider}) called ======`);

  const apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (ttsProvider.provider === "openai" && !apiKey) {
    console.error("[TTS] OPENAI_API_KEY is not set and Voicebox is not configured!");
    return jsonResponse({ error: "No TTS provider configured. Set VOICEBOX_URL + VOICEBOX_PROFILE_ID or OPENAI_API_KEY." }, 500);
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

    // If pages is an empty array, just return page count (init/extract only)
    if (Array.isArray(requestedPages) && requestedPages.length === 0) {
      const readyCount = existingNarration.filter((n: NarrationEntry) => n.status === "ready").length;
      const skippedCount = existingNarration.filter((n: NarrationEntry) => n.status === "skipped").length;
      const errorCount = existingNarration.filter((n: NarrationEntry) => n.status === "error").length;
      return jsonResponse({
        success: true,
        moduleId,
        variantId: variantId || null,
        totalPages: existingNarration.length,
        readyCount,
        skippedCount,
        errorCount,
      });
    }

    // 5. Process pages — sequential for Voicebox (CPU), parallel batches for OpenAI
    const PARALLEL_BATCH = ttsProvider.provider === "voicebox" ? 1 : 5;
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

    console.log(`[TTS] ${workItems.length} pages to generate (${ttsProvider.provider}, batch size: ${PARALLEL_BATCH})`);

    // Process in parallel batches
    for (let b = 0; b < workItems.length; b += PARALLEL_BATCH) {
      const batch = workItems.slice(b, b + PARALLEL_BATCH);
      console.log(`[TTS] Batch ${Math.floor(b / PARALLEL_BATCH) + 1}: pages ${batch.map(w => w.i).join(', ')}`);

      const results = await Promise.allSettled(batch.map(async (work) => {
        const { i, text, hash } = work;
        const entry = existingNarration[i];
        const narrationText = entry.fullText || entry.text || "";

        const { buffer: audioBuffer, contentType } = await generateAudio(text, apiKey, ttsProvider);
        const ext = contentType === "audio/wav" ? "wav" : "mp3";
        const fileName = `${storagePath}/page-${i}.${ext}`;
        const { error: uploadError } = await supabaseClient.storage
          .from("tts-audio")
          .upload(fileName, audioBuffer, { contentType, upsert: true });
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
