import { describe, expect, it } from 'vitest'
import { formatAge, formatKes, formatSex } from '../utils/format'
import { filtersToParams, parseFilters } from '../utils/listingQuery'
import { isKenyanPhone, rules } from '../utils/validation'

const filters = (overrides = {}) => ({ ...parseFilters(new URLSearchParams()), ...overrides })

describe('format', () => {
  it('formats KES amounts without decimals', () => {
    expect(formatKes(165000)).toBe('KES 165,000')
  })

  it('formats ages in months and years', () => {
    expect(formatAge(1)).toBe('1 month')
    expect(formatAge(4)).toBe('4 months')
    expect(formatAge(24)).toBe('2 years')
    expect(formatAge(26)).toBe('2 years, 2 months')
    expect(formatAge(undefined)).toBeNull()
  })

  it('returns null for unknown sex values instead of guessing', () => {
    expect(formatSex('female')).toBe('Female')
    expect(formatSex(undefined)).toBeNull()
  })
})

describe('parseFilters / filtersToParams', () => {
  it('drops invalid values from the URL', () => {
    const parsed = parseFilters(new URLSearchParams('sort=bogus&page=-2&minPrice=abc&maxPrice=-5'))
    expect(parsed).toMatchObject({ sort: 'newest', page: 1, minPrice: '', maxPrice: '' })
  })

  it('round-trips filters and omits defaults', () => {
    const f = filters({ q: 'boran', category: 'bulls', minPrice: '100000', sort: 'price_asc', page: 2 })
    const params = filtersToParams(f)
    expect(params.toString()).toBe('q=boran&category=bulls&minPrice=100000&sort=price_asc&page=2')
    expect(parseFilters(params)).toEqual(f)
    expect(filtersToParams(filters()).toString()).toBe('')
  })
})

describe('validation', () => {
  it('accepts common Kenyan phone formats', () => {
    for (const n of ['0712345678', '0112 345 678', '+254712345678', '254112345678']) expect(isKenyanPhone(n)).toBe(true)
    for (const n of ['12345', '0812345678', '+25471234567', 'phone']) expect(isKenyanPhone(n)).toBe(false)
  })

  it('validates KES amounts', () => {
    const check = rules.amountKes.validate
    expect(check('5000')).toBe(true)
    expect(check('5000.50')).toBe(true)
    expect(check('0')).toMatch(/at least/)
    expect(check('-10')).toMatch(/valid amount/)
    expect(check('1e5')).toMatch(/valid amount/)
    expect(check('20000000')).toMatch(/or less/)
  })
})
