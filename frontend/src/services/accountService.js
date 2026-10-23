import api from './api'
import { mapCustomerRequest, mapPage } from './mappers'

const ENDPOINTS = { inquiries: '/inquiries/', deposits: '/deposits/', withdrawals: '/withdrawals/' }

// The signed-in customer's own records; the server filters by session.
export async function listMyRequests(kind, page = 1) {
  const { data } = await api.get(ENDPOINTS[kind], { params: { page, page_size: 10 } })
  return mapPage(data, (item) => mapCustomerRequest(kind, item))
}
