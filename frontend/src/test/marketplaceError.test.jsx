import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fakeApi } from './fakeApi'
import { renderRoute } from './renderRoute'

const LIST = /^\/livestock\/$/

describe('Marketplace error handling', () => {
  it('shows a network error and recovers on retry', async () => {
    fakeApi.override('get', LIST, () => ({ networkError: true }), { once: true })
    const { user } = renderRoute('/marketplace')
    expect(await screen.findByRole('heading', { name: 'Listings could not be loaded' })).toBeInTheDocument()
    expect(screen.getByText(/could not reach the server/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findAllByRole('article')).toHaveLength(9)
  })

  it('explains timeouts and server errors without internals', async () => {
    fakeApi.override('get', LIST, () => ({ timeout: true }), { once: true })
    const first = renderRoute('/marketplace')
    expect(await screen.findByText(/took too long to respond/i)).toBeInTheDocument()
    first.unmount()

    fakeApi.override('get', LIST, () => ({ status: 500, data: '<html>Traceback (most recent call last)</html>' }), { once: true })
    renderRoute('/marketplace')
    expect(await screen.findByText(/something went wrong on our side/i)).toBeInTheDocument()
    expect(screen.queryByText(/Traceback/)).toBeNull()
  })

  it('shows the server validation message for an invalid filter URL', async () => {
    renderRoute('/marketplace?minPrice=300000&maxPrice=100000')
    expect(await screen.findByText('Minimum price cannot be more than the maximum.')).toBeInTheDocument()
  })

  it('falls back to the first page when the URL page is past the end', async () => {
    renderRoute('/marketplace?page=40')
    expect(await screen.findAllByRole('article')).toHaveLength(9)
    expect(fakeApi.requests.filter((r) => r.path === '/livestock/').map((r) => r.params.page)).toEqual([40, 1])
  })

  it('sends filters to the API with its parameter names', async () => {
    renderRoute('/marketplace?q=boran&category=bulls&breed=Boran&minPrice=1000&maxPrice=900000&sort=price_desc&page=1')
    await screen.findAllByRole('article')
    const request = fakeApi.requests.find((r) => r.path === '/livestock/')
    expect(request.params).toEqual({
      q: 'boran',
      category: 'bulls',
      breed: 'Boran',
      min_price: '1000',
      max_price: '900000',
      sort: 'price_desc',
      page: 1,
      page_size: 9,
    })
  })
})
