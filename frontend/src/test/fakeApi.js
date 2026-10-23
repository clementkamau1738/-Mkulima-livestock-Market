// In-memory stand-in for the Django API, plugged in as the Axios adapter so
// the real client, interceptors and error mapping all run in tests.
// Responses follow the API's real shapes (snake_case, error envelope).
import { AxiosError, AxiosHeaders } from 'axios'
import { mockCategories } from './fixtures/categories'
import { mockLivestock } from './fixtures/livestock'
import { mockPaymentInstructions } from './fixtures/paymentInstructions'

const PUBLIC = new Set(['available', 'reserved', 'sold'])
export const listingId = (fixtureId) => String(mockLivestock.findIndex((l) => l.id === fixtureId) + 1)

function toApi(listing, index, detail) {
  const images = listing.images.map((im, i) => ({
    id: index * 10 + i,
    url: im.src,
    alt_text: im.alt,
    caption: '',
    is_primary: im.isPrimary,
    sort_order: i,
  }))
  const category = mockCategories.find((c) => c.slug === listing.category)
  const data = {
    id: index + 1,
    slug: listing.id,
    title: listing.title,
    breed: listing.breed,
    category: { slug: category.slug, name: category.name },
    sex: listing.sex ?? '',
    age_months: listing.ageMonths ?? null,
    weight_kg: listing.weightKg ?? null,
    location: listing.location,
    price_kes: `${listing.priceKes}.00`,
    status: listing.status,
    published_at: listing.publishedAt,
    primary_image: images[0] ?? null,
  }
  return detail ? { ...data, description: listing.description, images } : data
}

const rows = () => mockLivestock.map((l, i) => ({ l, i })).filter(({ l }) => PUBLIC.has(l.status))

const SORTS = {
  newest: (a, b) => b.l.publishedAt.localeCompare(a.l.publishedAt),
  price_asc: (a, b) => a.l.priceKes - b.l.priceKes,
  price_desc: (a, b) => b.l.priceKes - a.l.priceKes,
}

const notFound = { status: 404, data: { error: { code: 'not_found', message: 'Not found.' } } }
const invalid = (fields) => ({
  status: 400,
  data: { error: { code: 'validation_error', message: 'Some of the information provided is not valid.', fields } },
})

function listLivestock(p) {
  if (p.min_price && p.max_price && Number(p.min_price) > Number(p.max_price)) {
    return invalid({ min_price: ['Minimum price cannot be more than the maximum.'] })
  }
  const q = (p.q ?? '').toLowerCase()
  const matches = rows().filter(({ l }) => {
    if (q && ![l.title, l.breed, l.location, l.description].some((f) => f.toLowerCase().includes(q))) return false
    if (p.category && l.category !== p.category) return false
    if (p.breed && l.breed.toLowerCase() !== p.breed.toLowerCase()) return false
    if (p.min_price && l.priceKes < Number(p.min_price)) return false
    if (p.max_price && l.priceKes > Number(p.max_price)) return false
    if (p.status && l.status !== p.status) return false
    return true
  })
  matches.sort(SORTS[p.sort ?? 'newest'])
  const size = Number(p.page_size ?? 9)
  const page = Number(p.page ?? 1)
  const totalPages = Math.max(1, Math.ceil(matches.length / size))
  if (page > totalPages) return notFound
  return {
    status: 200,
    data: {
      count: matches.length,
      page,
      total_pages: totalPages,
      next: null,
      previous: null,
      results: matches.slice((page - 1) * size, page * size).map(({ l, i }) => toApi(l, i, false)),
    },
  }
}

function findRow(id) {
  return rows().find(({ i }) => String(i + 1) === id)
}

const PREFIX = { inquiries: 'INQ', deposits: 'DEP', withdrawals: 'WDR' }

export const TEST_CUSTOMER = {
  id: 7,
  email: 'otieno@example.test',
  full_name: 'Otieno Sample',
  phone: '+254712345678',
  role: 'customer',
  is_reviewer: false,
  date_joined: '2026-10-01T09:00:00+03:00',
}

export const TEST_STAFF = { ...TEST_CUSTOMER, id: 2, email: 'staff@example.test', full_name: 'Njeri Staff', role: 'staff', is_reviewer: true }
export const TEST_ADMIN = { ...TEST_STAFF, id: 1, email: 'admin@example.test', full_name: 'Admin Person', role: 'admin' }

// Accepted by the fake /auth/login/.
export const TEST_PASSWORD = 'a-strong-test-pass-91'

function createState() {
  return { overrides: [], requests: [], byKey: new Map(), counter: 0, user: null, accounts: [TEST_CUSTOMER, TEST_STAFF, TEST_ADMIN] }
}

const notAuthenticated = { status: 403, data: { error: { code: 'not_authenticated', message: 'Authentication credentials were not provided.' } } }

let state = createState()

function authRoute(method, path, body) {
  if (method === 'get' && path === '/auth/session/') return { status: 200, data: { user: state.user } }
  if (method === 'post' && path === '/auth/logout/') {
    state.user = null
    return { status: 204, data: '' }
  }
  if (method === 'post' && path === '/auth/login/') {
    const account = state.accounts.find((a) => a.email === body.email?.toLowerCase())
    if (!account || body.password !== TEST_PASSWORD) {
      return { status: 403, data: { error: { code: 'invalid_credentials', message: 'The email or password is incorrect.' } } }
    }
    state.user = account
    return { status: 200, data: { user: account } }
  }
  if (method === 'post' && path === '/auth/register/') {
    if (state.accounts.some((a) => a.email === body.email.toLowerCase())) {
      return invalid({ email: ['An account with this email already exists. Sign in instead.'] })
    }
    const account = { ...TEST_CUSTOMER, id: 100 + state.accounts.length, email: body.email, full_name: body.full_name, phone: body.phone }
    state.accounts.push(account)
    state.user = account
    return { status: 201, data: { user: account } }
  }
  return null
}

const MEMBER_ONLY = /^\/(deposits|withdrawals)\/$|^\/admin\//

function route(method, path, params, body, headers) {
  let m
  const auth = authRoute(method, path, body)
  if (auth) return auth
  if (!state.user && (MEMBER_ONLY.test(path) || (method === 'get' && /^\/inquiries\/$/.test(path)))) return notAuthenticated
  if (/^\/admin\//.test(path) && !state.user.is_reviewer) {
    return { status: 403, data: { error: { code: 'permission_denied', message: 'Only staff can access this area.' } } }
  }
  if (method === 'get' && (m = path.match(/^\/(inquiries|deposits|withdrawals)\/$/))) {
    return { status: 200, data: { count: 0, page: 1, total_pages: 1, next: null, previous: null, results: [] } }
  }
  if (method === 'get' && path === '/livestock/') return listLivestock(params)
  if (method === 'get' && path === '/livestock/breeds/') return { status: 200, data: [...new Set(rows().map(({ l }) => l.breed))].sort() }
  if (method === 'get' && (m = path.match(/^\/livestock\/([^/]+)\/related\/$/))) {
    const row = findRow(m[1])
    if (!row) return notFound
    const related = rows().filter(({ l, i }) => i !== row.i && l.category === row.l.category && l.status !== 'sold').slice(0, 3)
    return { status: 200, data: related.map(({ l, i }) => toApi(l, i, false)) }
  }
  if (method === 'get' && (m = path.match(/^\/livestock\/([^/]+)\/$/))) {
    const row = findRow(m[1])
    return row ? { status: 200, data: toApi(row.l, row.i, true) } : notFound
  }
  if (method === 'get' && path === '/categories/') {
    return { status: 200, data: mockCategories.map(({ slug, name, description }) => ({ slug, name, description })) }
  }
  if (method === 'get' && path === '/payment-instructions/') {
    const { isPlaceholder, title, steps, methods, note } = mockPaymentInstructions
    return { status: 200, data: { is_placeholder: isPlaceholder, title, steps, methods, note, updated_at: null } }
  }
  if (method === 'post' && (m = path.match(/^\/(inquiries|deposits|withdrawals)\/$/))) {
    const key = headers['Idempotency-Key']
    if (key && state.byKey.has(key)) return { status: 200, data: state.byKey.get(key) }
    state.counter += 1
    const record = {
      ...body,
      reference: `${PREFIX[m[1]]}-TEST${String(state.counter).padStart(4, '0')}`,
      status: 'pending',
      created_at: '2026-10-21T10:00:00+03:00',
      history: [{ from_status: '', to_status: 'pending', created_at: '2026-10-21T10:00:00+03:00' }],
    }
    if (key) state.byKey.set(key, record)
    return { status: 201, data: record }
  }
  return notFound
}

export const fakeApi = {
  reset() {
    state = createState()
  },
  // Start the test with this user signed in (as if a session cookie existed).
  signIn(user = TEST_CUSTOMER) {
    state.user = user
  },
  // End the session server-side only, as an expiry would.
  expireSession() {
    state.user = null
  },
  // Replace the response for matching requests: handler returns
  // { status, data }, { networkError: true }, { timeout: true } or a Promise of one.
  override(method, pattern, handler, { once = false } = {}) {
    state.overrides.push({ method, pattern, handler, once })
  },
  get requests() {
    return state.requests
  },
  async adapter(config) {
    const method = config.method.toLowerCase()
    const path = config.url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '')
    const headers = AxiosHeaders.from(config.headers).toJSON()
    const body = config.data ? JSON.parse(config.data) : undefined
    state.requests.push({ method, path, params: config.params ?? {}, body, headers })

    const index = state.overrides.findIndex((o) => o.method === method && o.pattern.test(path))
    let result
    if (index >= 0) {
      const override = state.overrides[index]
      if (override.once) state.overrides.splice(index, 1)
      result = await override.handler({ path, body, headers, params: config.params ?? {} })
    } else {
      result = route(method, path, config.params ?? {}, body, headers)
    }

    if (result.timeout) throw new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED', config)
    if (result.networkError) throw new AxiosError('Network Error', 'ERR_NETWORK', config)
    const response = { data: result.data, status: result.status, statusText: '', headers: {}, config }
    if (result.status >= 400) {
      throw new AxiosError(`Request failed with status code ${result.status}`, 'ERR_BAD_RESPONSE', config, null, response)
    }
    return response
  },
}
