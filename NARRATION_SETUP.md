# Module Narration — Voice Clone Setup & Rollout

**Date:** 4 July 2026
**Status:** The narration pipeline is fully built and deployed. The only missing pieces are the provider account, your cloned voice, and running the backfill.

---

## What already exists (don't rebuild any of this)

- **`generate-narration` edge function** — extracts clean per-page text from module HTML (strips buttons, feedback, grown-up notes, emoji), generates audio, uploads to the public `tts-audio` storage bucket, and tracks per-page status in `narration_data`.
- **Content-hash caching** — a page is only re-billed if its text actually changed. Re-running is always safe and never double-spends.
- **Auto-trigger for new modules** — the admin module builder kicks off chunked narration automatically after generating a module (all age variants in parallel).
- **Player** — module.html shows a "Read to me" 🔊 button with pause/resume and speed control (0.75×–1.5×) whenever a page has ready audio.
- **Admin regeneration** — per-module narration buttons exist in Module Builder and Module Customisation.
- **New (this session):** ElevenLabs added as a provider, and `scripts/backfill-narration.mjs` for bulk-narrating the existing catalogue with a dry-run cost quote.

**Cost shape:** narration is per **module/variant**, shared by every child who opens it. It is a **one-time** cost per module, not per play and not per child. That changes the economics completely — even premium TTS is affordable.

---

## Provider recommendation (price / effectiveness / accuracy)

A typical module narrates ~15,000–30,000 characters (pages are capped at 4,000 chars; cover page skipped). Costs below assume **~25k chars per module** — run the dry-run for your exact number.

| | **Cartesia Sonic** ⭐ recommended | **ElevenLabs** (fallback if clone quality disappoints) | OpenAI gpt-4o-mini-tts | Replicate Chatterbox / self-hosted |
|---|---|---|---|---|
| Voice cloning | Instant clone from ~10–20s of audio (all tiers); Pro clone on Startup+ | Instant clone (1–2 min audio); **Professional Voice Clone** (30 min–3 h audio) is the accuracy benchmark | ❌ None — preset voices only | Yes, but proven flaky in your own code history |
| Plan needed | **Pro $5/mo** = 100K credits (1 credit/char, commercial use included); Startup $49/mo = 1.25M | Creator $22/mo = 121K credits; overage $0.30/1k chars (v2) or ~half on Flash v2.5 | Pay-as-you-go | Replicate per-second billing |
| **Cost per module (~25k chars)** | **~$1.25** (≈4 modules on the $5 plan) | ~$3.75–7.50 | ~$0.40 | variable |
| Quality/accuracy | Very good, consistent, fast (synchronous API) | Best-in-class, especially PVC | Good voice, but it isn't *your* voice | Your code comments document the problems: turbo ignores the voice prompt, initial-rush audio quirk, 429 throttling |
| Reliability | Synchronous API, stored voice IDs, already the **preferred provider in your code** | Mature, plan-limited concurrency (handled: batch of 3) | Very reliable | The reason this has felt "very difficult" |

**Recommendation: start with Cartesia Pro at $5/month.** Your codebase already prefers it, instant cloning is included, commercial use is included, and the whole existing catalogue will likely cost **$10–40 one-time** to backfill. If — and only if — the instant clone of your sample doesn't sound close enough, step up to **ElevenLabs Professional Voice Clone** (Creator $22/mo, needs 30+ min of clean source audio); it's now wired in as a provider too, so switching is one secret change, no code.

**Retire the Voicebox and Replicate paths** once Cartesia is live — they're what made this painful (CPU inference taking minutes per page; cloning silently ignored).

### About your voice sample (this determines clone accuracy more than the platform)

- **Consent/rights first:** make sure you have written permission from the voice's owner to clone it for commercial use — every platform requires you to attest to this, and it's a real legal exposure for a children's product.
- Best source: **clean, dry recording** — one speaker, no music, no echo, no compression artifacts. Quiet room, consistent mic distance.
- For Cartesia instant clone: 10–20 seconds is the minimum; ~1–2 minutes of varied, natural reading is better. Read children's-story-style content in the warm tone you want — clones inherit the *style* of the sample, not just the timbre.
- If you can get **30+ minutes** of the same voice, that unlocks ElevenLabs PVC later without re-recording.

---

## Setup steps (about 30 minutes)

### 1. Create the Cartesia account and clone the voice

1. Sign up at play.cartesia.ai → upgrade to **Pro ($5/mo)** (commercial use starts at Pro).
2. Voices → **Clone a voice** → upload your sample → confirm consent.
3. Test it in their playground with a paragraph of actual module text (paste something from a real module — child-directed, warm). Iterate on the sample if it sounds off.
4. Copy the **Voice ID** and create an **API key** (API Keys section).

### 2. Configure the edge function (dev project)

```powershell
npx supabase secrets set CARTESIA_API_KEY=sk_car_... --project-ref wximnkhcpugfyjshgaim
npx supabase secrets set CARTESIA_VOICE_ID=<voice-uuid> --project-ref wximnkhcpugfyjshgaim
```

Nothing else — the function automatically prefers Cartesia once both secrets exist. (The updated function with ElevenLabs support is already deployed to dev.)

### 3. Pilot: one module end-to-end

```powershell
# Quote the whole catalogue first (no audio generated, nothing billed):
node scripts/backfill-narration.mjs --dry-run

# Then narrate ONE module and listen to it:
node scripts/backfill-narration.mjs --limit 1
```

Open that module as a child in the app → tap **Read to me** on a few pages. Listen for: pronunciation of character names (Kip, Coco, Pepper…), pacing, warmth, and how questions sound. If a specific word is mispronounced consistently, tell me — we can add a pronunciation substitution step to the text extractor.

### 4. Backfill the catalogue

```powershell
node scripts/backfill-narration.mjs
```

Runs one module at a time (provider-safe), saves progress after every batch, and re-running only processes what's missing or failed. The summary prints total characters and the exact spend.

### 5. New modules — nothing to do

The module builder already triggers narration automatically after generation. Every new module comes out narrated in the cloned voice.

### 6. If the Cartesia clone isn't good enough → ElevenLabs

1. ElevenLabs Creator plan ($22/mo) → VoiceLab → **Professional Voice Clone** → upload 30+ min of clean audio (or start with an instant clone to preview).
2. ```powershell
   npx supabase secrets set ELEVENLABS_API_KEY=... --project-ref wximnkhcpugfyjshgaim
   npx supabase secrets set ELEVENLABS_VOICE_ID=... --project-ref wximnkhcpugfyjshgaim
   npx supabase secrets set TTS_PROVIDER=elevenlabs --project-ref wximnkhcpugfyjshgaim
   ```
3. Re-run the backfill with `--force` for the modules you want in the new voice. (Optional: `ELEVENLABS_MODEL_ID=eleven_flash_v2_5` halves the credit cost at slightly lower fidelity.)

Remove `TTS_PROVIDER` to fall back to Cartesia. Never configure both without an override — the explicit `TTS_PROVIDER` secret decides.

---

## Ongoing costs (what to expect)

| Scenario | Cartesia cost |
|---|---|
| Backfill existing catalogue (one-time) | Run the dry-run for the exact quote; ballpark **$10–40** |
| Each new module/variant | **~$0.75–1.50** one-time |
| A month with 10 new modules | ~$10–15 → the $5 Pro plan + a small credit top-up, or Startup $49 in heavy months, downgrade after |
| Children *playing* narration | **$0** — audio is stored in your Supabase bucket and served from there |

Storage: ~25 min of 128 kbps MP3 per module ≈ 25 MB. A 100-module catalogue ≈ 2.5 GB in the `tts-audio` bucket — pennies on Supabase, but worth knowing.

## Watch-outs

- **Bucket is public** (by design — audio URLs are unauthenticated). Fine for narration; don't ever put child data in it.
- **Prod rollout**: when you promote to prod, set the same secrets on `mikxrneopcwuldmykswq` and deploy `generate-narration` there (`--no-verify-jwt`). The backfill script targets whatever `SUPABASE_URL`/service key you give it.
- **Per-character voices later**: `super_skills.voice_id` already exists as a column — one day each Brain Town character can have their own cloned voice. Don't do this now; one great voice beats seven mediocre ones.
- **Pricing drift**: rates in this doc and in the backfill script's quote table were verified July 2026; re-check before big spends.
