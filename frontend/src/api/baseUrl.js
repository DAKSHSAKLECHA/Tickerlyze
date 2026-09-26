export function apiBaseUrl(value = '') {
  const base = value.trim().replace(/\/+$/, '')
  if (!base) return '/api'
  return base.endsWith('/api') ? base : `${base}/api`
}
