export function buildModuleUrl(module, childId) {
  const modulePath = module.link || '/module.html'
  if (!childId) return modulePath
  const separator = modulePath.includes('?') ? '&' : '?'
  let url = `${modulePath}${separator}childId=${encodeURIComponent(childId)}`
  if (window.state && window.state.isCurrentUserAdmin) url += '&isAdmin=true'
  return url
}
