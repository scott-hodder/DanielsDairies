export function buildModuleUrl(module, childId) {
  const modulePath = module.link || '/module.html'
  if (!childId) return modulePath
  const separator = modulePath.includes('?') ? '&' : '?'
  return `${modulePath}${separator}childId=${encodeURIComponent(childId)}`
}
