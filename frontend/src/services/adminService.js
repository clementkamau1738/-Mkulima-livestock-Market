// Staff-only API calls. The server checks the role on every request; these
// functions only shape data for the admin screens.
import api from './api'
import { mapAccount, mapAdminListing, mapAdminRequest, mapAuditEntry, mapPage } from './mappers'

const PAGE_SIZE = 20

function clean(params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
}

export async function getSummary() {
  const { data } = await api.get('/admin/summary/')
  return data
}

// kind: 'inquiries' | 'deposits' | 'withdrawals'
export async function listRequests(kind, { page = 1, q = '', status = '' } = {}) {
  const { data } = await api.get(`/admin/${kind}/`, { params: clean({ page, page_size: PAGE_SIZE, q, status }) })
  return mapPage(data, (item) => mapAdminRequest(kind, item))
}

export async function getRequest(kind, reference) {
  const { data } = await api.get(`/admin/${kind}/${encodeURIComponent(reference)}/`)
  return mapAdminRequest(kind, data)
}

export const TRANSITION_FIELDS = { reason: 'reason', confirmed: 'confirmed', external_reference: 'externalReference' }

export async function transitionRequest(kind, reference, { status, reason = '', confirmed = false, externalReference = '' }) {
  const { data } = await api.post(`/admin/${kind}/${encodeURIComponent(reference)}/transition/`, {
    status,
    reason,
    confirmed,
    external_reference: externalReference,
  })
  return mapAdminRequest(kind, data)
}

export async function listListings({ page = 1, q = '', status = '', category = '' } = {}) {
  const { data } = await api.get('/admin/livestock/', { params: clean({ page, page_size: PAGE_SIZE, q, status, category }) })
  return mapPage(data, mapAdminListing)
}

export async function getListing(id) {
  const { data } = await api.get(`/admin/livestock/${id}/`)
  return mapAdminListing(data)
}

export const LISTING_FIELDS = {
  title: 'title',
  breed: 'breed',
  category: 'category',
  sex: 'sex',
  age_months: 'ageMonths',
  weight_kg: 'weightKg',
  location: 'location',
  price_kes: 'priceKes',
  description: 'description',
}

function listingPayload(values) {
  const optionalNumber = (v) => (v === '' || v == null ? null : Number(v))
  return {
    title: values.title,
    breed: values.breed,
    category: values.category,
    sex: values.sex,
    age_months: optionalNumber(values.ageMonths),
    weight_kg: optionalNumber(values.weightKg),
    location: values.location,
    price_kes: values.priceKes,
    description: values.description,
  }
}

export async function createListing(values) {
  const { data } = await api.post('/admin/livestock/', listingPayload(values))
  return mapAdminListing(data)
}

export async function updateListing(id, values) {
  const { data } = await api.patch(`/admin/livestock/${id}/`, listingPayload(values))
  return mapAdminListing(data)
}

export async function transitionListing(id, { status, reason = '' }) {
  const { data } = await api.post(`/admin/livestock/${id}/transition/`, { status, reason })
  return mapAdminListing(data)
}

export async function uploadImage(listingId, file, altText) {
  const form = new FormData()
  form.append('image', file)
  form.append('alt_text', altText)
  // Uploads on slow mobile connections need longer than the default timeout.
  await api.post(`/admin/livestock/${listingId}/images/`, form, { timeout: 120000 })
}

export async function updateImage(listingId, imageId, changes) {
  const payload = {}
  if ('altText' in changes) payload.alt_text = changes.altText
  if ('isPrimary' in changes) payload.is_primary = changes.isPrimary
  await api.patch(`/admin/livestock/${listingId}/images/${imageId}/`, payload)
}

export async function deleteImage(listingId, imageId) {
  await api.delete(`/admin/livestock/${listingId}/images/${imageId}/`)
}

export async function listAccounts({ page = 1, q = '', role = '', active = '' } = {}) {
  const { data } = await api.get('/admin/accounts/', { params: clean({ page, page_size: PAGE_SIZE, q, role, is_active: active }) })
  return mapPage(data, mapAccount)
}

export async function getAccount(id) {
  const { data } = await api.get(`/admin/accounts/${id}/`)
  return { ...mapAccount(data), requestCounts: data.request_counts }
}

export async function setAccountAccess(id, { isActive, reason }) {
  const { data } = await api.post(`/admin/accounts/${id}/access/`, { is_active: isActive, reason })
  return mapAccount(data)
}

export async function listAuditLog({ page = 1, q = '', action = '' } = {}) {
  const { data } = await api.get('/admin/audit-log/', { params: clean({ page, page_size: PAGE_SIZE, q, action }) })
  return mapPage(data, mapAuditEntry)
}
