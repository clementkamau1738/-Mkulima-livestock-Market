// Translates between URL query parameters and marketplace filters. The same
// parameter names will be sent to the API in Phase 3.

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

const SORTS = new Set(SORT_OPTIONS.map((o) => o.value))

function toAmount(value) {
  if (value == null || value === '') return ''
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? String(Math.floor(n)) : ''
}

export function parseFilters(searchParams) {
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const sort = searchParams.get('sort')
  return {
    q: (searchParams.get('q') ?? '').trim(),
    category: searchParams.get('category') ?? '',
    breed: searchParams.get('breed') ?? '',
    minPrice: toAmount(searchParams.get('minPrice')),
    maxPrice: toAmount(searchParams.get('maxPrice')),
    sort: SORTS.has(sort) ? sort : 'newest',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function filtersToParams(filters) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.category) params.set('category', filters.category)
  if (filters.breed) params.set('breed', filters.breed)
  if (filters.minPrice) params.set('minPrice', filters.minPrice)
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort)
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))
  return params
}

export function hasActiveFilters(filters) {
  return Boolean(filters.q || filters.category || filters.breed || filters.minPrice || filters.maxPrice)
}
