import { PAGE_SIZE } from '../config/site'
import api from './api'
import { mapListing, mapPage } from './mappers'

function listParams(filters) {
  const params = { page: filters.page, page_size: PAGE_SIZE }
  if (filters.q) params.q = filters.q
  if (filters.category) params.category = filters.category
  if (filters.breed) params.breed = filters.breed
  if (filters.minPrice) params.min_price = filters.minPrice
  if (filters.maxPrice) params.max_price = filters.maxPrice
  if (filters.sort && filters.sort !== 'newest') params.sort = filters.sort
  return params
}

export async function listLivestock(filters) {
  try {
    const { data } = await api.get('/livestock/', { params: listParams(filters) })
    return mapPage(data, mapListing)
  } catch (error) {
    // A stale ?page= beyond the last page: show the first page instead of an error.
    if (error.status === 404 && filters.page > 1) return listLivestock({ ...filters, page: 1 })
    throw error
  }
}

export async function getLivestock(id) {
  const { data } = await api.get(`/livestock/${encodeURIComponent(id)}/`)
  return mapListing(data)
}

export async function getRelatedLivestock(listing) {
  const { data } = await api.get(`/livestock/${encodeURIComponent(listing.id)}/related/`)
  return data.map(mapListing)
}

export async function getFeaturedLivestock(limit = 4) {
  const { data } = await api.get('/livestock/', { params: { status: 'available', page_size: limit } })
  return data.results.map(mapListing)
}

export async function getCategories() {
  const { data } = await api.get('/categories/')
  return data
}

export async function getBreeds() {
  const { data } = await api.get('/livestock/breeds/')
  return data
}
