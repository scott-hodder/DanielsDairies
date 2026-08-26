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
import { withCors } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://app.danielsdiaries.com.au",
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

// Replicate Chatterbox — using STANDARD chatterbox (not turbo). Turbo silently ignores
// audio_prompt for voice cloning; standard supports it.
const REPLICATE_CHATTERBOX_URL = "https://api.replicate.com/v1/models/resemble-ai/chatterbox/predictions";

// Cartesia Sonic — commercial voice cloning, stored voice IDs, consistent output.
// IMPORTANT: the model matters for accent fidelity. Clones sound like the
// playground only on the current Sonic generation — the legacy sonic-2 path
// drifted cloned voices toward American. Pin the model the playground uses;
// override with CARTESIA_MODEL_ID if Cartesia ships a newer one.
const CARTESIA_TTS_URL = "https://api.cartesia.ai/tts/bytes";
const CARTESIA_VERSION = "2026-03-01";
const CARTESIA_MODEL = Deno.env.get("CARTESIA_MODEL_ID") || "sonic-3.5";

// ElevenLabs — highest-fidelity voice cloning (Professional Voice Clone).
// Configure ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID to use. Model is
// multilingual v2 by default; set ELEVENLABS_MODEL_ID=eleven_flash_v2_5 to
// halve credit usage at slightly lower fidelity.
const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

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
function getTtsProvider(): {
  provider: "azure" | "cartesia" | "elevenlabs" | "replicate" | "voicebox" | "openai";
  voiceboxUrl?: string;
  profileId?: string;
  replicateToken?: string;
  replicateVoiceUrl?: string;
  cartesiaKey?: string;
  cartesiaVoiceId?: string;
  elevenLabsKey?: string;
  elevenLabsVoiceId?: string;
  azureKey?: string;
  azureRegion?: string;
  azureVoice?: string;
} {
  const override = Deno.env.get("TTS_PROVIDER");
  const cartesiaKey = Deno.env.get("CARTESIA_API_KEY");
  const cartesiaVoiceId = Deno.env.get("CARTESIA_VOICE_ID");
  const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
  const elevenLabsVoiceId = Deno.env.get("ELEVENLABS_VOICE_ID");
  const azureKey = Deno.env.get("AZURE_SPEECH_KEY");
  const azureRegion = Deno.env.get("AZURE_SPEECH_REGION");
  const azureVoice = Deno.env.get("AZURE_TTS_VOICE") || "en-AU-TimNeural";

  // Explicit override wins — lets you A/B providers by flipping one
  // secret without removing the others' keys.
  if (override === "azure" && azureKey && azureRegion) {
    return { provider: "azure", azureKey, azureRegion, azureVoice };
  }
  if (override === "elevenlabs" && elevenLabsKey && elevenLabsVoiceId) {
    return { provider: "elevenlabs", elevenLabsKey, elevenLabsVoiceId };
  }
  if (override === "cartesia" && cartesiaKey && cartesiaVoiceId) {
    return { provider: "cartesia", cartesiaKey, cartesiaVoiceId };
  }

  // Default priority: Azure (native en-AU neural voices — no accent drift)
  // → Cartesia (cheap commercial cloning) → ElevenLabs (highest-fidelity
  // cloning) → legacy providers → OpenAI (no cloning).
  if (azureKey && azureRegion) {
    return { provider: "azure", azureKey, azureRegion, azureVoice };
  }
  if (cartesiaKey && cartesiaVoiceId) {
    return { provider: "cartesia", cartesiaKey, cartesiaVoiceId };
  }
  if (elevenLabsKey && elevenLabsVoiceId) {
    return { provider: "elevenlabs", elevenLabsKey, elevenLabsVoiceId };
  }
  const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
  if (override === "replicate" && replicateToken) {
    return {
      provider: "replicate",
      replicateToken,
      replicateVoiceUrl: Deno.env.get("REPLICATE_VOICE_URL") || undefined,
    };
  }
  const voiceboxUrl = Deno.env.get("VOICEBOX_URL");
  const profileId = Deno.env.get("VOICEBOX_PROFILE_ID");
  if (voiceboxUrl && profileId) {
    return { provider: "voicebox", voiceboxUrl, profileId };
  }
  return { provider: "openai" };
}

/**
 * Call Replicate Chatterbox to generate audio.
 * Uses Prefer: wait for synchronous response; falls back to polling if not done.
 */
async function generateAudioReplicate(
  text: string,
  apiToken: string,
  voiceUrl?: string,
): Promise<ArrayBuffer> {
  // Chatterbox Turbo: uses `text` (not `prompt`) and `audio_prompt_path` (not `audio_prompt`).
  // Standard Chatterbox uses the other names. Send both keys so the same code works on either model.
  // Prepend "... " to absorb Chatterbox's initial-rush quirk (first ~1s plays too fast)
  const paddedText = "... " + text;
  const input: Record<string, unknown> = {
    text: paddedText,
    prompt: paddedText,
    cfg_weight: 0.5,
    exaggeration: 0.5,
  };
  if (voiceUrl) {
    input.audio_prompt_path = voiceUrl;
    input.audio_prompt = voiceUrl;
  }

  console.log(`[Replicate] === generateAudioReplicate called ===`);
  console.log(`[Replicate] text len=${text.length}, voiceUrl=${voiceUrl || "(none — DEFAULT VOICE)"}`);
  console.log(`[Replicate] input keys=${Object.keys(input).join(",")}`);
  console.log(`[Replicate] input.audio_prompt=${(input as any).audio_prompt || "(unset)"}`);
  console.log(`[Replicate] input.audio_prompt_path=${(input as any).audio_prompt_path || "(unset)"}`);
  const _t0 = Date.now();

  // Retry on 429 throttling (new accounts: 6/min, burst of 1, until $5 credit)
  let createRes: Response;
  let attempt = 0;
  const maxAttempts = 6;
  while (true) {
    createRes = await fetch(REPLICATE_CHATTERBOX_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Prefer": "wait=60",
      },
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(90 * 1000),
    });

    if (createRes.status !== 429) break;
    attempt++;
    if (attempt >= maxAttempts) break;
    // Honour Retry-After header if present, else exponential backoff
    const retryAfter = parseInt(createRes.headers.get("retry-after") || "0", 10);
    const waitMs = (retryAfter > 0 ? retryAfter : Math.min(2 ** attempt, 30)) * 1000 + 500;
    console.log(`[Replicate] 429 throttled, waiting ${waitMs}ms (attempt ${attempt}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  if (!createRes.ok) {
    const errBody = await createRes.text().catch(() => "");
    throw new Error(`Replicate create error ${createRes.status}: ${errBody.slice(0, 500)}`);
  }

  let prediction = await createRes.json();
  console.log(`[Replicate] Prediction ${prediction.id} status=${prediction.status}`);

  // If still running, poll until done (up to 5 minutes)
  const pollUrl: string | undefined = prediction.urls?.get;
  const maxPollMs = 5 * 60 * 1000;
  const pollStart = Date.now();
  while (
    pollUrl &&
    (prediction.status === "starting" || prediction.status === "processing")
  ) {
    if (Date.now() - pollStart > maxPollMs) {
      throw new Error("Replicate prediction timed out after 5 minutes");
    }
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(pollUrl, {
      headers: { "Authorization": `Bearer ${apiToken}` },
      signal: AbortSignal.timeout(30 * 1000),
    });
    if (!pollRes.ok) {
      throw new Error(`Replicate poll error ${pollRes.status}`);
    }
    prediction = await pollRes.json();
  }

  if (prediction.status !== "succeeded") {
    throw new Error(`Replicate prediction ${prediction.status}: ${prediction.error || "unknown error"}`);
  }

  // Output is a URL string (or array of URL strings)
  const out = prediction.output;
  const audioUrl = Array.isArray(out) ? out[0] : out;
  if (!audioUrl || typeof audioUrl !== "string") {
    throw new Error("Replicate returned no audio URL: " + JSON.stringify(out).slice(0, 200));
  }

  const audioRes = await fetch(audioUrl, { signal: AbortSignal.timeout(2 * 60 * 1000) });
  if (!audioRes.ok) {
    throw new Error(`Replicate audio download error ${audioRes.status}`);
  }
  const buf = await audioRes.arrayBuffer();
  console.log(`[Replicate] DONE in ${Date.now() - _t0}ms — ${buf.byteLength} bytes`);
  return buf;
}

/**
 * Call Cartesia Sonic to generate audio.
 * Returns MP3 audio bytes directly (no polling — synchronous).
 */
async function generateAudioCartesia(
  text: string,
  apiKey: string,
  voiceId: string,
): Promise<ArrayBuffer> {
  console.log(`[Cartesia] text len=${text.length}, voice=${voiceId}`);
  const t0 = Date.now();

  // Free/Pro tiers allow very few concurrent requests — retry 429s with
  // backoff instead of failing the page.
  const maxAttempts = 6;
  let res: Response;
  let attempt = 0;
  while (true) {
    res = await fetch(CARTESIA_TTS_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Cartesia-Version": CARTESIA_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: CARTESIA_MODEL,
        transcript: text,
        voice: { mode: "id", id: voiceId },
        output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 },
        language: "en",
      }),
      signal: AbortSignal.timeout(120 * 1000),
    });
    if (res.status !== 429) break;
    attempt++;
    if (attempt >= maxAttempts) break;
    const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
    const waitMs = (retryAfter > 0 ? retryAfter : Math.min(2 ** attempt, 20)) * 1000 + Math.random() * 500;
    console.log(`[Cartesia] 429 concurrency limit, waiting ${Math.round(waitMs)}ms (attempt ${attempt}/${maxAttempts})`);
    await res.body?.cancel();
    await new Promise((r) => setTimeout(r, waitMs));
  }

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Cartesia error ${res.status}: ${err.slice(0, 500)}`);
  }
  const buf = await res.arrayBuffer();
  console.log(`[Cartesia] DONE in ${Date.now() - t0}ms — ${buf.byteLength} bytes`);
  return buf;
}

/**
 * Call ElevenLabs to generate audio with a cloned voice.
 * Returns MP3 bytes synchronously.
 */
async function generateAudioElevenLabs(
  text: string,
  apiKey: string,
  voiceId: string,
): Promise<ArrayBuffer> {
  const modelId = Deno.env.get("ELEVENLABS_MODEL_ID") || "eleven_multilingual_v2";
  console.log(`[ElevenLabs] text len=${text.length}, voice=${voiceId}, model=${modelId}`);
  const t0 = Date.now();
  const doRequest = () => fetch(`${ELEVENLABS_TTS_URL}/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
    signal: AbortSignal.timeout(120 * 1000),
  });
  let res = await doRequest();
  // Concurrency limits vary by plan — back off and retry rather than fail.
  for (let attempt = 0; res.status === 429 && attempt < 3; attempt++) {
    await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
    res = await doRequest();
  }
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`ElevenLabs error ${res.status}: ${err.slice(0, 500)}`);
  }
  const buf = await res.arrayBuffer();
  console.log(`[ElevenLabs] DONE in ${Date.now() - t0}ms — ${buf.byteLength} bytes`);
  return buf;
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
  // Voicebox /generate is SYNCHRONOUS — it blocks until generation completes
  // and returns { id, profile_id, text, audio_path, duration, ... }.
  // There is no /history polling endpoint. CPU inference can take minutes,
  // so we use a generous AbortSignal timeout (8 min) to keep the connection alive.
  // See: https://docs.voicebox.sh/developer/tts-generation
  const GEN_TIMEOUT_MS = 8 * 60 * 1000;

  console.log(`[Voicebox] POST ${voiceboxUrl}/generate (text len=${text.length})`);
  const response = await fetch(`${voiceboxUrl}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
    body: JSON.stringify({
      profile_id: profileId,
      text,
      language: "en",
      instruct: VOICEBOX_INSTRUCT,
    }),
    signal: AbortSignal.timeout(GEN_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`Voicebox /generate error ${response.status}: ${errorBody.slice(0, 500)}`);
  }

  const result = await response.json();
  const generationId = result?.id;
  console.log(`[Voicebox] /generate ok: id=${generationId} duration=${result?.duration} audio_path=${result?.audio_path ? "yes" : "no"}`);

  if (!generationId) {
    throw new Error("Voicebox returned no generation id: " + JSON.stringify(result).slice(0, 300));
  }

  // Generation is already complete — fetch the audio file by id
  const audioResponse = await fetch(`${voiceboxUrl}/audio/${generationId}`, {
    headers: { "ngrok-skip-browser-warning": "true" },
    signal: AbortSignal.timeout(2 * 60 * 1000),
  });

  if (!audioResponse.ok) {
    const errBody = await audioResponse.text().catch(() => "");
    throw new Error(`Voicebox /audio fetch error ${audioResponse.status}: ${errBody.slice(0, 300)}`);
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
 * Call Azure AI Speech (neural TTS) — native Australian voices, so no
 * accent drift. SSML with a slightly slowed rate reads better for kids.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function generateAudioAzure(
  text: string,
  key: string,
  region: string,
  voice: string,
  rate?: string,
  pitch?: string,
): Promise<ArrayBuffer> {
  // Default: slightly faster and brighter than neutral — kid narration reads
  // flat and slow at Azure's neutral settings.
  const r = rate || Deno.env.get("AZURE_TTS_RATE") || "+5%";
  const p = pitch || Deno.env.get("AZURE_TTS_PITCH") || "+3%";
  const ssml =
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-AU'>` +
    `<voice name='${voice}'><prosody rate='${r}' pitch='${p}'>${escapeXml(text)}</prosody></voice></speak>`;

  const doRequest = () =>
    fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
        "User-Agent": "daniels-diaries-narration",
      },
      body: ssml,
    });

  let response = await doRequest();
  // The free (F0) tier rate-limits aggressively — one polite retry.
  if (response.status === 429) {
    await new Promise((r) => setTimeout(r, 3000));
    response = await doRequest();
  }
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`Azure TTS error ${response.status}: ${errorBody}`);
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
  overrides?: { provider?: string; voice?: string; rate?: string; pitch?: string },
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  // Explicit per-request provider (admin A/B testing across modules).
  if (overrides?.provider === "elevenlabs" && overrides?.voice) {
    const elKey = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
    if (!elKey) throw new Error("ELEVENLABS_API_KEY not configured");
    const buffer = await generateAudioElevenLabs(text, elKey, overrides.voice);
    return { buffer, contentType: "audio/mpeg" };
  }
  if (ttsProvider.provider === "azure") {
    const buffer = await generateAudioAzure(
      text,
      ttsProvider.azureKey!,
      ttsProvider.azureRegion!,
      overrides?.voice || ttsProvider.azureVoice!,
      overrides?.rate,
      overrides?.pitch,
    );
    return { buffer, contentType: "audio/mpeg" };
  }
  if (ttsProvider.provider === "cartesia") {
    const buffer = await generateAudioCartesia(text, ttsProvider.cartesiaKey!, ttsProvider.cartesiaVoiceId!);
    return { buffer, contentType: "audio/mpeg" };
  }
  if (ttsProvider.provider === "elevenlabs") {
    const buffer = await generateAudioElevenLabs(text, ttsProvider.elevenLabsKey!, ttsProvider.elevenLabsVoiceId!);
    return { buffer, contentType: "audio/mpeg" };
  }
  if (ttsProvider.provider === "replicate") {
    const buffer = await generateAudioReplicate(text, ttsProvider.replicateToken!, ttsProvider.replicateVoiceUrl);
    return { buffer, contentType: "audio/wav" };
  }
  if (ttsProvider.provider === "voicebox") {
    const buffer = await generateAudioVoicebox(text, ttsProvider.voiceboxUrl!, ttsProvider.profileId!);
    return { buffer, contentType: "audio/wav" };
  }
  const buffer = await generateAudioOpenAI(text, apiKey);
  return { buffer, contentType: "audio/mpeg" };
}

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  const ttsProvider = getTtsProvider();
  console.log(`[TTS] ====== generate-narration (${ttsProvider.provider}) called ======`);
  console.log(`[TTS] env REPLICATE_API_TOKEN=${Deno.env.get("REPLICATE_API_TOKEN") ? "SET" : "MISSING"}`);
  console.log(`[TTS] env REPLICATE_VOICE_URL=${Deno.env.get("REPLICATE_VOICE_URL") || "(MISSING)"}`);
  console.log(`[TTS] resolved replicateVoiceUrl=${ttsProvider.replicateVoiceUrl || "(none)"}`);

  const apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (ttsProvider.provider === "openai" && !apiKey) {
    console.error("[TTS] No TTS provider configured!");
    return jsonResponse({ error: "No TTS provider configured. Set AZURE_SPEECH_KEY+AZURE_SPEECH_REGION, REPLICATE_API_TOKEN, VOICEBOX_URL+VOICEBOX_PROFILE_ID, or OPENAI_API_KEY." }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseClient = auth.admin;

  try {
    const body = await req.json().catch(() => ({}));
    const { moduleId, variantId, pages: requestedPages, force = false, background = false } = body;
    // Optional per-request overrides (admin-only function) — lets us A/B
    // providers, voices and pacing across modules without touching secrets.
    const ttsOverrides = { provider: body.ttsProvider, voice: body.ttsVoice, rate: body.ttsRate, pitch: body.ttsPitch };

    // ── Voice-library helpers (ElevenLabs) ──
    if (body.action === "list-voices") {
      const elKey = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
      if (!elKey) return jsonResponse({ error: "ELEVENLABS_API_KEY not configured" }, 500);
      const params = new URLSearchParams({ page_size: "30", language: "en" });
      if (body.gender) params.set("gender", body.gender);
      if (body.accent) params.set("accent", body.accent);
      const trim = (v: Record<string, unknown>) => ({
        voice_id: v.voice_id,
        name: v.name,
        accent: v.accent ?? (v.labels as Record<string, unknown>)?.accent,
        gender: v.gender ?? (v.labels as Record<string, unknown>)?.gender,
        age: v.age ?? (v.labels as Record<string, unknown>)?.age,
        use_case: v.use_case ?? (v.labels as Record<string, unknown>)?.use_case,
        description: String(v.description || "").slice(0, 140),
        preview_url: v.preview_url,
        public_owner_id: v.public_owner_id,
        cloned_by_count: v.cloned_by_count,
      });
      const [mine, shared] = await Promise.all([
        fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": elKey } })
          .then((r) => r.json()).catch((e) => ({ error: String(e) })),
        fetch(`https://api.elevenlabs.io/v1/shared-voices?${params}`, { headers: { "xi-api-key": elKey } })
          .then((r) => r.json()).catch((e) => ({ error: String(e) })),
      ]);
      return jsonResponse({
        my_voices: (mine.voices || []).map(trim),
        shared: (shared.voices || []).map(trim),
        mine_error: mine.error || mine.detail, shared_error: shared.error || shared.detail,
      });
    }
    if (body.action === "add-voice") {
      const elKey = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
      if (!elKey) return jsonResponse({ error: "ELEVENLABS_API_KEY not configured" }, 500);
      const res = await fetch(
        `https://api.elevenlabs.io/v1/voices/add/${body.publicOwnerId}/${body.voiceId}`,
        {
          method: "POST",
          headers: { "xi-api-key": elKey, "Content-Type": "application/json" },
          body: JSON.stringify({ new_name: body.name || "AU Narrator" }),
        },
      );
      const out = await res.json().catch(() => ({}));
      return jsonResponse({ status: res.status, result: out });
    }
    console.log("[TTS] Request:", JSON.stringify({ moduleId, variantId, force, background, pages: requestedPages }));

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
        return jsonResponse({ error: "Variant not found", detail: varError?.message || "no row" }, 404);
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
        // Strip headings entirely — we only want body text narrated
        text = text.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '');
        // Strip grown-up note blocks — they're for parents, not for narration.
        // Match the whole collapsible <div> by its id="grownup-note-N" wrapper.
        text = text.replace(/<div[^>]*id="grownup-note-[^"]*"[\s\S]*?<\/div>/gi, '');
        // Also strip any element containing the literal text "Grown-Up Note"
        text = text.replace(/<div[^>]*>[\s\S]{0,200}?Grown-Up Note[\s\S]*?<\/div>/gi, '');
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
        // Strip emojis and pictographs — TTS tries to read them as "face with tears of joy" etc.
        text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '');
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

    // 5. Build work list (pages that actually need generation)
    // Concurrency is plan-limited on both cloning providers (Cartesia free/Pro
    // tiers allow very few concurrent requests; ElevenLabs Creator allows 5).
    // Stay low — the 429 retry handles the rest.
    // Batch size must follow the provider actually doing the work — a
    // per-request override can differ from the env-configured default.
    const effectiveTts = ttsOverrides.provider || ttsProvider.provider;
    const PARALLEL_BATCH = effectiveTts === "voicebox" ? 1 : effectiveTts === "replicate" ? 3 : effectiveTts === "cartesia" ? 2 : effectiveTts === "elevenlabs" ? 2 : 5;
    const narrationData: NarrationEntry[] = [...existingNarration];
    const pagesToProcess = requestedPages || existingNarration.map((_: NarrationEntry, i: number) => i);

    const workItems: { i: number; text: string; hash: string }[] = [];
    for (let i = 0; i < existingNarration.length; i++) {
      if (!pagesToProcess.includes(i)) continue;
      const entry = existingNarration[i];
      // Skip narration on the first page (cover/intro)
      if (i === 0) {
        narrationData[i] = { ...entry, audioUrl: null, status: "skipped" };
        continue;
      }
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

    console.log(`[TTS] ${workItems.length} pages to generate (${ttsProvider.provider}, batch=${PARALLEL_BATCH}, background=${background})`);
    console.log(`[TTS] requested pages=${requestedPages ? JSON.stringify(requestedPages) : "ALL"}`);
    console.log(`[TTS] work item indices=${workItems.map(w => w.i).join(",")}`);

    // The actual processing loop — extracted so it can run inline OR in waitUntil
    const processWork = async () => {
      let hasErrors = false;
      for (let b = 0; b < workItems.length; b += PARALLEL_BATCH) {
        const batch = workItems.slice(b, b + PARALLEL_BATCH);
        const _bt = Date.now();
        console.log(`[TTS] Batch ${Math.floor(b / PARALLEL_BATCH) + 1}/${Math.ceil(workItems.length / PARALLEL_BATCH)}: pages ${batch.map(w => w.i).join(', ')} START`);

        const results = await Promise.allSettled(batch.map(async (work) => {
          const { i, text, hash } = work;
          const { buffer: audioBuffer, contentType } = await generateAudio(text, apiKey, ttsProvider, ttsOverrides);
          const ext = contentType === "audio/wav" ? "wav" : "mp3";
          const fileName = `${storagePath}/page-${i}.${ext}`;
          const { error: uploadError } = await supabaseClient.storage
            .from("tts-audio")
            .upload(fileName, audioBuffer, { contentType, upsert: true });
          if (uploadError) throw new Error(`Storage upload: ${uploadError.message}`);
          const { data: urlData } = supabaseClient.storage.from("tts-audio").getPublicUrl(fileName);
          return { i, hash, audioUrl: urlData.publicUrl };
        }));

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

        console.log(`[TTS] Batch ${Math.floor(b / PARALLEL_BATCH) + 1} END in ${Date.now() - _bt}ms`);
        // Save progress after each batch (so the client can poll)
        await supabaseClient
          .from(targetTable)
          .update({ narration_data: narrationData, narration_status: "generating" })
          .eq("id", targetId);
      }

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
      return { readyCount, skippedCount, errorCount, finalStatus };
    };

    // Background mode: kick off via waitUntil and return immediately
    if (background) {
      // @ts-ignore — EdgeRuntime is provided by Supabase Deno runtime
      if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
        // @ts-ignore
        EdgeRuntime.waitUntil(processWork().catch((e) => console.error("[TTS] background error:", e)));
      } else {
        // Fallback: fire and forget
        processWork().catch((e) => console.error("[TTS] background error:", e));
      }
      return jsonResponse({
        success: true,
        background: true,
        moduleId,
        variantId: variantId || null,
        totalPages: existingNarration.length,
        queued: workItems.length,
      });
    }

    // Foreground mode: run inline and return final state
    const { readyCount, skippedCount, errorCount, finalStatus } = await processWork();

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
}));
