import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from './renderRoute'
import credits from '../content/photoCredits.json'

const PAGES = [
  ['/', /find the right animal for your farm/i],
  ['/marketplace', /browse livestock/i],
  ['/marketplace/1', /in-calf friesian heifer/i],
  ['/how-it-works', /how mkulima works/i],
  ['/deposit', /submit a deposit request/i],
  ['/withdraw', /request a withdrawal/i],
  ['/login', /welcome back/i],
  ['/register', /create your account/i],
  ['/terms', /terms of use/i],
  ['/privacy', /privacy policy/i],
  ['/does-not-exist', /page not found/i],
]

describe('routing', () => {
  it.each(PAGES)('renders %s', async (path, heading) => {
    renderRoute(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('navigates with the main navigation', async () => {
    const { user, router } = renderRoute('/')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    await user.click(within(nav).getByRole('link', { name: 'How It Works' }))
    expect(router.state.location.pathname).toBe('/how-it-works')
    expect(await screen.findByRole('heading', { level: 1, name: /how mkulima works/i })).toBeInTheDocument()
  })

  it('toggles the mobile menu accessibly and closes it on navigation', async () => {
    const { user, router } = renderRoute('/')
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const menu = document.getElementById('mobile-menu')
    await user.click(within(menu).getByRole('link', { name: 'Deposit' }))
    expect(router.state.location.pathname).toBe('/deposit')
    expect(document.getElementById('mobile-menu')).toBeNull()
  })

  it('closes the mobile menu with Escape', async () => {
    const { user } = renderRoute('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('home search sends the keyword to the marketplace', async () => {
    const { user, router } = renderRoute('/')
    await user.type(screen.getByRole('searchbox', { name: 'Search livestock' }), 'Boran')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(router.state.location.pathname).toBe('/marketplace')
    expect(router.state.location.search).toBe('?q=Boran')
  })
})

describe('Photo credits', () => {
  it('credits every bundled photo with author, licence and source', async () => {
    renderRoute('/photo-credits')
    expect(await screen.findByRole('heading', { level: 1, name: 'Photo credits' })).toBeInTheDocument()
    const sources = screen.getAllByRole('link', { name: 'Original on Wikimedia Commons' })
    expect(sources.length).toBe(credits.length)
    sources.forEach((link) => expect(link.getAttribute('href')).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/))
    expect(screen.getAllByText(/^Photo by /)).toHaveLength(credits.length)
    expect(screen.getByText('Homepage hero')).toBeInTheDocument()
  })
})
