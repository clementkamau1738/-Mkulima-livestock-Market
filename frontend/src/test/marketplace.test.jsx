import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from './renderRoute'

const cards = async () => {
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Loading listings' })).toBeNull())
  return within(screen.getByRole('region', { name: 'Results' })).queryAllByRole('article')
}

describe('Marketplace', () => {
  it('shows loading skeletons, then the first page of listings', async () => {
    renderRoute('/marketplace')
    expect(screen.getByRole('status', { name: 'Loading listings' })).toBeInTheDocument()
    expect(await cards()).toHaveLength(9)
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('reads filters from the URL', async () => {
    renderRoute('/marketplace?category=bulls&sort=price_desc')
    const articles = await cards()
    expect(articles).toHaveLength(3)
    expect(within(articles[0]).getByRole('heading')).toHaveTextContent('Boran breeding bull')
    expect(screen.getAllByLabelText('Category')[0]).toHaveValue('bulls')
  })

  it('syncs category, sort and search changes to the URL and resets the page', async () => {
    const { user, router } = renderRoute('/marketplace?page=2')
    await cards()
    const [category] = screen.getAllByLabelText('Category')
    await user.selectOptions(category, 'calves')
    expect(router.state.location.search).toBe('?category=calves')

    await user.selectOptions(screen.getByLabelText('Sort by'), 'price_asc')
    expect(router.state.location.search).toBe('?category=calves&sort=price_asc')

    await user.type(screen.getByRole('searchbox', { name: 'Search livestock' }), 'friesian')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('friesian')
    const articles = await cards()
    expect(articles.map((a) => within(a).getByRole('heading').textContent).sort()).toEqual([
      'Friesian heifer calf',
      'Jersey-Friesian cross heifer calf',
    ])
  })

  it('applies a price range and rejects an inverted one', async () => {
    const { user, router } = renderRoute('/marketplace')
    await cards()
    const [min] = screen.getAllByLabelText('Min')
    const [max] = screen.getAllByLabelText('Max')
    await user.type(min, '200000')
    await user.type(max, '100000')
    await user.click(screen.getAllByRole('button', { name: 'Apply price' })[0])
    expect(screen.getByRole('alert')).toHaveTextContent('Minimum price cannot be more than the maximum')
    expect(router.state.location.search).toBe('')

    await user.clear(max)
    await user.click(screen.getAllByRole('button', { name: 'Apply price' })[0])
    expect(router.state.location.search).toBe('?minPrice=200000')
    expect(await cards()).toHaveLength(2)
  })

  it('paginates and keeps the page in the URL', async () => {
    const { user, router } = renderRoute('/marketplace')
    await cards()
    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(router.state.location.search).toBe('?page=2')
    expect(await cards()).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('shows an empty state that can clear filters', async () => {
    const { user, router } = renderRoute('/marketplace?q=zebra')
    expect(await screen.findByRole('heading', { name: 'No livestock matches your search' })).toBeInTheDocument()
    const clear = screen.getAllByRole('button', { name: 'Clear all filters' })
    await user.click(clear[clear.length - 1])
    expect(router.state.location.search).toBe('')
    expect(await cards()).toHaveLength(9)
  })

  it('removes a single filter from its chip', async () => {
    const { user, router } = renderRoute('/marketplace?category=dairy&breed=Jersey')
    await cards()
    await user.click(screen.getByRole('button', { name: 'Remove filter Jersey' }))
    expect(router.state.location.search).toBe('?category=dairy')
  })
})
