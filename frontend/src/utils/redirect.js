// Only same-site paths are accepted as a post-login destination, so a crafted
// ?next= link cannot send people to another website.
export function safeNext(value, fallback) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}

export function homeFor(user) {
  return user?.isReviewer ? '/admin' : '/account'
}

export function loginPath(location) {
  return `/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`
}
