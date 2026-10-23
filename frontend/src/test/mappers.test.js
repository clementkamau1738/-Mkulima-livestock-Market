import { describe, expect, it } from 'vitest'
import { toApiError } from '../services/api'
import { mapFieldErrors, mapListing } from '../services/mappers'

describe('mapListing', () => {
  it('maps API fields and keeps missing optional fields null', () => {
    const listing = mapListing({
      id: 9,
      slug: 'sahiwal-bull',
      title: 'Sahiwal bull',
      breed: 'Sahiwal',
      category: { slug: 'bulls', name: 'Bulls' },
      sex: 'male',
      age_months: null,
      weight_kg: null,
      location: 'Machakos',
      price_kes: '185000.00',
      status: 'available',
      published_at: '2026-10-05T08:00:00Z',
      primary_image: { id: 3, url: 'http://x/media/a.webp', alt_text: '', caption: 'Side view', is_primary: true },
    })
    expect(listing).toMatchObject({ id: '9', category: 'bulls', categoryName: 'Bulls', priceKes: 185000, ageMonths: null, weightKg: null })
    expect(listing.images).toEqual([{ id: 3, src: 'http://x/media/a.webp', alt: 'Side view', altText: '', caption: 'Side view', isPrimary: true }])
  })

  it('handles listings without images', () => {
    expect(mapListing({ id: 1, title: 'T', price_kes: '1.00', primary_image: null }).images).toEqual([])
  })
})

describe('mapFieldErrors', () => {
  it('splits known and unknown API fields', () => {
    expect(mapFieldErrors({ full_name: ['Too short'], idempotency_key: ['Bad'] }, { full_name: 'fullName' })).toEqual({
      known: { fullName: 'Too short' },
      other: ['Bad'],
    })
  })
})

describe('toApiError', () => {
  it('never surfaces a raw server body', () => {
    const error = toApiError({ response: { status: 500, data: '<pre>KeyError at /api/</pre>' } })
    expect(error.message).toMatch(/something went wrong on our side/i)
    expect(error.message).not.toMatch(/KeyError/)
  })

  it('treats a missing session as a sign-in prompt', () => {
    const error = toApiError({ response: { status: 403, data: { error: { code: 'not_authenticated', message: 'x' } } } })
    expect(error).toMatchObject({ code: 'not_authenticated', message: 'Please sign in to continue.' })
  })
})
