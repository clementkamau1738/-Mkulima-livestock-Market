import type { Locator, Page } from '@playwright/test'
import { BasePage } from './base.page'
import { ListingGrid } from './components/listing-grid'

export class HomePage extends BasePage {
  readonly path = '/'
  readonly heading: Locator
  readonly searchBox: Locator
  readonly searchButton: Locator
  readonly featured: ListingGrid
  readonly categories: Locator
  readonly browseLivestock: Locator

  constructor(page: Page, isMobile: boolean) {
    super(page, isMobile)
    this.heading = page.getByRole('heading', { level: 1 })
    this.searchBox = page.getByRole('searchbox', { name: 'Search livestock' })
    this.searchButton = page.getByRole('search').getByRole('button', { name: 'Search' })
    this.featured = new ListingGrid(page.getByRole('region', { name: 'Featured livestock' }))
    this.categories = page.getByRole('region', { name: 'Browse by category' }).getByRole('link')
    // The hero button; the closing call to action repeats the same link further down.
    this.browseLivestock = page.getByRole('main').getByRole('link', { name: 'Browse Livestock' }).first()
  }

  category(name: string): Locator {
    return this.categories.filter({ has: this.page.getByRole('heading', { name, exact: true }) })
  }

  async search(term: string): Promise<void> {
    await this.searchBox.fill(term)
    await this.searchButton.click()
  }
}
