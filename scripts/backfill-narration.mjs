#!/usr/bin/env node
// ============================================================
// Narration backfill for existing modules
// ============================================================
// Narrates every module/variant that doesn't have ready audio, via the
// generate-narration edge function (which handles extraction, hashing,
// storage upload, and progress persistence).
//
// ALWAYS start with a dry run — it extracts the narration text for every
// module WITHOUT generating any audio, and prints an exact character count
// and cost quote per provider, so you know the bill before spending a cent.
//
// Usage:
//   node scripts/backfill-narration.mjs --dry-run          # quote only, no audio
//   node scripts/backfill-narration.mjs                    # narrate everything missing audio
//   node scripts/backfill-narration.mjs --limit 3          # first 3 targets only (pilot run)
//   node scripts/backfill-narration.mjs --module <uuid>    # one specific module
//   node scripts/backfill-narration.mjs --force            # regenerate even if ready
//
// Env (put in .env.local or pass inline):
//   VITE_SUPABASE_URL (or SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY
//
// The script runs one module at a time (the edge function batches pages
// internally per provider limits), so it is slow but rate-limit safe.
// Content hashes mean re-running never re-bills unchanged pages.

import { readFileSync, existsSync } from 'node:fs'

// ── Load env from .env.local if present ──
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+[A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (checked env and .env.local)')
  process.exit(1)
}

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : Infinity
const ONLY_MODULE = args.includes('--module') ? args[args.indexOf('--module') + 1] : null

// Cost per 1,000 characters (verified July 2026 — update if plans change)
const RATES = {
  'Cartesia Pro ($5/mo, 100K credits)': 0.05,
  'Cartesia Startup ($49/mo, 1.25M credits)': 0.0392,
  'ElevenLabs Creator multilingual v2 (overage)': 0.30,
  'ElevenLabs Flash v2.5 (0.5 credits/char)': 0.15,
  'OpenAI gpt-4o-mini-tts (no cloning)': 0.015
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY
}

async function rest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers })
  if (!res.ok) throw new Error(`REST ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function callNarration(body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-narration`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`generate-narration ${res.status}: ${JSON.stringify(json)}`)
  return json
}

function narratableChars(narrationData) {
  // Mirror the edge function's rules: page 0 skipped, <20 chars skipped,
  // pages capped at 4,000 chars.
  let chars = 0
  ;(narrationData || []).forEach((entry, i) => {
    if (i === 0) return
    const text = entry.fullText || entry.text || ''
    if (text.length < 20) return
    chars += Math.min(text.length, 4000)
  })
  return chars
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (quote only — no audio generated)' : 'GENERATE'}${FORCE ? ' + FORCE' : ''}`)

  // 1. Discover targets: variants where they exist, otherwise the module itself
  const modFilter = ONLY_MODULE ? `&id=eq.${ONLY_MODULE}` : ''
  const modules = await rest(`modules?select=id,title,code,narration_status,is_active&order=created_at${modFilter}`)
  const variants = await rest('module_variants?select=id,module_id,age_band,narration_status')
  const variantsByModule = new Map()
  for (const v of variants) {
    const list = variantsByModule.get(v.module_id) || []
    list.push(v)
    variantsByModule.set(v.module_id, list)
  }

  const targets = []
  for (const mod of modules) {
    if (mod.is_active === false && !ONLY_MODULE) continue
    const vars = variantsByModule.get(mod.id) || []
    if (vars.length > 0) {
      for (const v of vars) {
        if (FORCE || v.narration_status !== 'ready') {
          targets.push({ moduleId: mod.id, variantId: v.id, label: `${mod.title} (ages ${v.age_band})`, table: 'module_variants', id: v.id })
        }
      }
    } else if (FORCE || mod.narration_status !== 'ready') {
      targets.push({ moduleId: mod.id, variantId: null, label: mod.title, table: 'modules', id: mod.id })
    }
  }

  const work = targets.slice(0, LIMIT)
  console.log(`Found ${targets.length} target(s) needing narration${work.length < targets.length ? `, processing first ${work.length}` : ''}\n`)
  if (work.length === 0) {
    console.log('Nothing to do — everything already has ready narration. Use --force to regenerate.')
    return
  }

  let totalChars = 0
  let done = 0
  let failed = 0

  for (const target of work) {
    process.stdout.write(`[${done + failed + 1}/${work.length}] ${target.label} ... `)
    try {
      // Extract-only pass: pages: [] populates narration_data texts without
      // generating audio, and returns page counts.
      const init = await callNarration({ moduleId: target.moduleId, variantId: target.variantId, pages: [], force: FORCE })

      // Read back the extracted texts for an exact char count
      const rows = await rest(`${target.table}?select=narration_data&id=eq.${target.id}`)
      const chars = narratableChars(rows?.[0]?.narration_data)
      totalChars += chars
      process.stdout.write(`${init.totalPages} pages, ${chars.toLocaleString()} chars`)

      if (DRY_RUN) {
        console.log(' [quoted]')
        done++
        continue
      }

      // Full generation — the edge function batches pages per provider limits.
      const result = await callNarration({ moduleId: target.moduleId, variantId: target.variantId, force: FORCE })
      if (result.errorCount > 0) {
        console.log(` — DONE with ${result.errorCount} page error(s) (re-run to retry those pages)`)
      } else {
        console.log(` — DONE (${result.readyCount} ready, ${result.skippedCount} skipped)`)
      }
      done++
    } catch (err) {
      console.log(` — FAILED: ${err.message}`)
      failed++
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Targets processed: ${done}  |  Failed: ${failed}`)
  console.log(`Total narratable characters: ${totalChars.toLocaleString()}`)
  console.log('\nCost to generate this much audio (one-time — cached until text changes):')
  for (const [name, per1k] of Object.entries(RATES)) {
    console.log(`  ${name.padEnd(48)} $${((totalChars / 1000) * per1k).toFixed(2)} ${name.includes('OpenAI') ? '(approx, per-minute pricing)' : ''}`)
  }
  if (DRY_RUN) {
    console.log('\nDry run complete — no audio was generated and nothing was billed.')
    console.log('Run again without --dry-run to generate.')
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
