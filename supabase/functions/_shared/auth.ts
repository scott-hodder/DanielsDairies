import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2'

export type AuthContext = {
  user: User
  admin: ReturnType<typeof createClient>
}

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function serverConfig() {
  return {
    url: Deno.env.get('SUPABASE_URL') ?? '',
    anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  }
}

export async function requireUser(req: Request): Promise<AuthContext | Response> {
  const { url, anonKey, serviceRoleKey } = serverConfig()
  if (!url || !anonKey || !serviceRoleKey) return jsonError('Missing server configuration', 500)

  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) return jsonError('Unauthorized', 401)

  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } }
  })
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return jsonError('Unauthorized', 401)

  return {
    user,
    admin: createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }
}

export async function requireAdmin(req: Request): Promise<AuthContext | Response> {
  const context = await requireUser(req)
  if (context instanceof Response) return context

  const { data: profile, error } = await context.admin
    .from('parent_profiles')
    .select('is_admin')
    .eq('id', context.user.id)
    .maybeSingle()

  if (error) return jsonError('Could not verify administrator access', 500)
  if (!profile?.is_admin) return jsonError('Administrator access required', 403)
  return context
}

export function requireServiceRole(req: Request): Response | null {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!serviceRoleKey) return jsonError('Missing server configuration', 500)
  const authorization = req.headers.get('Authorization') ?? ''
  if (authorization !== `Bearer ${serviceRoleKey}`) return jsonError('Unauthorized', 401)
  return null
}
