import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

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

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    const html = String(body?.html ?? '').trim()
    const failures = Array.isArray(body?.failures) ? body.failures : []
    const customInstructions = String(body?.customInstructions ?? '').trim()

    if (!html) {
      return jsonResponse({ error: 'Missing html' }, 400)
    }

    if (!failures.length) {
      return jsonResponse({ error: 'No failures provided' }, 400)
    }

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
      "You are an expert HTML module editor for a children's therapeutic education platform called Daniel's Diaries. " +
      'Your job is to fix specific audit failures in the generated HTML module WITHOUT changing the overall structure, design, page count, or working content. ' +
      'Only make the minimum changes needed to pass the failing audit checks.\n\n' +
      'RULES:\n' +
      '1. Return ONLY the complete fixed HTML. No explanations, no markdown, just the raw HTML document.\n' +
      '2. Do NOT remove or restructure pages that are already working.\n' +
      '3. Do NOT change CSS styles, JavaScript logic, or the page navigation system.\n' +
      '4. Focus ONLY on content text changes needed to pass the failing checks.\n' +
      '5. Use Australian English spelling throughout.\n' +
      '6. Never use deficit or pathologising language.\n' +
      '7. Preserve all data-page attributes, onclick handlers, and interactive elements exactly as they are.'

    const userPrompt =
      'Here is the current module HTML that has audit failures:\n\n' +
      `--- FAILING AUDIT CHECKS ---\n${errorDescriptions}\n\n` +
      (customInstructions ? `--- CUSTOM INSTRUCTIONS ---\n${customInstructions}\n\n` : '') +
      `--- CURRENT HTML ---\n${html}\n\n` +
      'Please fix ONLY the failing audit checks listed above. Return the complete fixed HTML.'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.claude_api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 64000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return jsonResponse({ error: `Claude API error (${response.status}): ${errorText}` }, 400)
    }

    const data = await response.json()

    if (data?.stop_reason === 'max_tokens') {
      return jsonResponse({ error: 'Claude hit the max token limit while returning the fixed HTML. Try reducing module size or splitting content before fixing.' }, 400)
    }
    let fixedContent = ''
    if (Array.isArray(data?.content)) {
      for (const block of data.content) {
        if (block?.type === 'text') {
          fixedContent += String(block?.text ?? '')
        }
      }
    }

    fixedContent = fixedContent.trim()
    if (fixedContent.startsWith('```html')) {
      fixedContent = fixedContent.replace(/^```html\s*\n?/, '').replace(/\n?```\s*$/, '')
    } else if (fixedContent.startsWith('```')) {
      fixedContent = fixedContent.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    if (!fixedContent || (!fixedContent.includes('<!DOCTYPE') && !fixedContent.includes('<html') && !fixedContent.includes('<head'))) {
      return jsonResponse({ error: 'AI did not return valid HTML. The response may have been malformed.' }, 400)
    }

    return jsonResponse({
      html: fixedContent,
      usage: data?.usage ?? null,
      stopReason: data?.stop_reason ?? null
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 400)
  }
})
