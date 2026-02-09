import { isSupabaseConfigured, supabaseConfigError } from '../supabaseClient.js'

export function renderDevSetupMessage(containerId = 'app') {
  if (isSupabaseConfigured || import.meta.env.MODE !== 'development') return false

  const container = document.getElementById(containerId) || document.body
  const message = document.createElement('div')
  message.style.padding = '16px'
  message.style.margin = '16px'
  message.style.border = '1px solid #f59e0b'
  message.style.borderRadius = '8px'
  message.style.background = '#fffbeb'
  message.style.color = '#92400e'
  message.innerHTML = `<strong>Setup required:</strong> ${supabaseConfigError?.message || 'Missing Supabase env vars.'}`
  container.prepend(message)
  return true
}
