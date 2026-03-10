import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

type FixOperation = {
  find: string
  replace: string
  replaceAll?: boolean
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function extractTextContent(data: any): string {
  if (!Array.isArray(data?.content)) return ''
  let output = ''
  for (const block of data.content) {
    if (block?.type === 'text') output += String(block?.text ?? '')
  }
  return output.trim()
}

function extractJsonPayload(raw: string): any {
  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    return JSON.parse(trimmed)
  } catch {
    // Continue: maybe wrapped in markdown or prefixed text
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1])
    } catch {
      // Continue to object-slice attempt
    }
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = trimmed.slice(firstBrace, lastBrace + 1)
    return JSON.parse(sliced)
  }

  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing required environment configuration' }, 500)
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })

    const {
      data: { user },
      error: authError
    } = await authClient.auth.getUser()

    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    const html = String(body?.html ?? '').trim()
    const failures = Array.isArray(body?.failures) ? body.failures : []
    const customInstructions = String(body?.customInstructions ?? '').trim()

    if (!html) return jsonResponse({ error: 'Missing html' }, 400)
    if (!failures.length) return jsonResponse({ error: 'No failures provided' }, 400)

    const { data: settings, error: settingsError } = await admin
      .from('settings')
      .select('claude_api_key')
      .single()

    if (settingsError || !settings?.claude_api_key) {
      return jsonResponse({ error: 'Claude API key not configured in settings table' }, 400)
    }

    const errorDescriptions = failures
      .map((f: Record<string, unknown>, i: number) => {
        const severity = String(f?.severity ?? 'IMPORTANT')
        const rule = String(f?.rule ?? 'Unknown rule')
        const description = String(f?.description ?? '')
        const evidence = String(f?.evidence ?? '')
        const remediation = String(f?.remediation ?? '')

        return `${i + 1}. [${severity}] ${rule}\n   ${description}${
          evidence ? `\n   Evidence: ${evidence}` : ''
        }${remediation ? `\n   Fix: ${remediation}` : ''}`
      })
      .join('\n\n')

    const systemPrompt =
      "You edit HTML modules for Daniel's Diaries. Return ONLY JSON with minimal textual replacement operations to fix audit failures.\n" +
      'Do not return full HTML. Do not return markdown.\n' +
      'Schema: {"operations":[{"find":"exact text","replace":"replacement text","replaceAll":true|false}],"notes":"optional"}\n' +
      'Rules:\n' +
      '1) Keep operations minimal and safe.\n' +
      '2) Preserve structure, CSS, JS, data-page attributes, onclick handlers.\n' +
      '3) Focus on content wording only unless a missing required phrase needs insertion.\n' +
      '4) Use Australian English spelling.\n' +
      '5) If insertion is required, use find/replace on a nearby exact anchor string.'

    const userPrompt =
      'Failing audit checks:\n' +
      `${errorDescriptions}\n\n` +
      (customInstructions ? `Custom instructions:\n${customInstructions}\n\n` : '') +
      'Current HTML:\n' +
      `${html}\n\n` +
      'Return JSON operations only.'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.claude_api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return jsonResponse({ error: `Claude API error (${response.status}): ${errorText}` }, 400)
    }

    const data = await response.json()
    const text = extractTextContent(data)
    const payload = extractJsonPayload(text)
    const operationsRaw = Array.isArray(payload?.operations) ? payload.operations : []

    const operations: FixOperation[] = operationsRaw
      .map((op: any) => ({
        find: String(op?.find ?? ''),
        replace: String(op?.replace ?? ''),
        replaceAll: Boolean(op?.replaceAll)
      }))
      .filter((op: FixOperation) => op.find.length > 0)
      .slice(0, 80)

    if (!operations.length) {
      return jsonResponse({
        error:
          'AI did not return valid replacement operations. Please retry with clearer custom instructions.'
      }, 400)
    }

    return jsonResponse({
      operations,
      usage: data?.usage ?? null,
      stopReason: data?.stop_reason ?? null
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 400)
  }
})
