const ADMIN_ROUTE_PARAMETER = '__cafeInAdminRoute'
const ROUTE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/

export function restoreAdminPath(request) {
  const url = new URL(request.url || '/', 'https://cafein.invalid')
  if (url.pathname !== '/api/admin') return false

  const route = url.searchParams.get(ADMIN_ROUTE_PARAMETER)
  if (!route) return false

  const segments = route.split('/')
  if (segments.some((segment) => !ROUTE_SEGMENT.test(segment) || segment === '.' || segment === '..')) return false

  url.searchParams.delete(ADMIN_ROUTE_PARAMETER)
  request.url = '/api/admin/' + segments.map(encodeURIComponent).join('/') + (url.search ? url.search : '')
  return true
}
