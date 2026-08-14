// Shared CORS handling for browser-facing edge functions.
//
// The frontend is served from more than one origin (production and dev),
// but each function builds its responses with a hardcoded production
// Access-Control-Allow-Origin, which breaks preflight from every other
// environment. Wrapping the handler in withCors() echoes the request's
// origin instead whenever it is on the allowlist.

const ALLOWED_ORIGINS = new Set([
  'https://app.danielsdiaries.com.au',
  'https://dev.danielsdiaries.com.au'
])

type Handler = (req: Request) => Response | Promise<Response>

export function withCors(handler: Handler): Handler {
  return async (req) => {
    const res = await handler(req)
    const origin = req.headers.get('origin') ?? ''
    if (!ALLOWED_ORIGINS.has(origin)) return res

    const headers = new Headers(res.headers)
    headers.set('Access-Control-Allow-Origin', origin)
    headers.append('Vary', 'Origin')
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers
    })
  }
}
