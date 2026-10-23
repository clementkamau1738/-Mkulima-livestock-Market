const kes = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 })

export function formatKes(amount) {
  return `KES ${kes.format(amount)}`
}

export function formatAge(months) {
  if (months == null) return null
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`
  const years = Math.floor(months / 12)
  const rest = months % 12
  const y = `${years} ${years === 1 ? 'year' : 'years'}`
  return rest ? `${y}, ${rest} ${rest === 1 ? 'month' : 'months'}` : y
}

const SEX_LABELS = { male: 'Male', female: 'Female' }

export function formatSex(sex) {
  return SEX_LABELS[sex] ?? null
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatCategory(slug) {
  return slug ? slug.charAt(0).toUpperCase() + slug.slice(1).replaceAll('_', ' ') : ''
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_WORDS = {
  pending: 'Pending review',
  viewing_arranged: 'Viewing arranged',
}

export function formatStatus(status) {
  return STATUS_WORDS[status] ?? formatCategory(status)
}
