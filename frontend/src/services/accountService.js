import api from './api'
import { mapCustomerRequest, mapPage } from './mappers'

const ENDPOINTS = { inquiries: '/inquiries/', deposits: '/deposits/', withdrawals: '/withdrawals/' }

// Statuses an inquiry can still be cancelled from (the server decides; this only hides the button).
export const OPEN_INQUIRY_STATUSES = ['pending', 'contacted', 'viewing_arranged']

// The signed-in customer withdraws their own open inquiry.
export async function cancelInquiry(reference, reason = '') {
  const { data } = await api.post(`/inquiries/${encodeURIComponent(reference)}/cancel/`, { reason })
  return mapCustomerRequest('inquiries', data)
}

// The signed-in customer's own records; the server filters by session.
export async function listMyRequests(kind, page = 1) {
  const { data } = await api.get(ENDPOINTS[kind], { params: { page, page_size: 10 } })
  return mapPage(data, (item) => mapCustomerRequest(kind, item))
}
