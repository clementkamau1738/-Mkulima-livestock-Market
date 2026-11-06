import type { Locator, Page } from '@playwright/test'
import { BasePage } from './base.page'
import { ListingGrid } from './components/listing-grid'
import { Pagination } from './components/pagination'

/**
 * /marketplace. Filter controls are located by role, which skips hidden
 * elements: on desktop they are in the sidebar, on phones in the panel the
 * "Filters" button opens. Call openFilters() before using them.
 */
export class MarketplacePage extends BasePage {
  readonly path = '/marketplace'
  readonly results: Locator
  readonly grid: ListingGrid
  readonly pagination: Pagination
  readonly summary: Locator
  readonly skeleton: Locator
  readonly searchBox: Locator
  readonly searchButton: Locator
  readonly sort: Locator
  readonly filtersToggle: Locator
  readonly category: Locator
  readonly breed: Locator
  readonly minPrice: Locator
  readonly maxPrice: Locator
  readonly applyPrice: Locator
  readonly priceError: Locator
  readonly activeFilters: Locator
  readonly emptyState: Locator
  readonly errorState: Locator

  constructor(page: Page, isMobile: boolean) {
    super(page, isMobile)
    this.results = page.getByRole('region', { name: 'Results' })
    this.grid = new ListingGrid(this.results)
    this.pagination = new Pagination(this.results)
    this.summary = this.results.getByText(/^\d+ listings?( · page \d+ of \d+)?$/)
    this.skeleton = page.getByRole('status', { name: 'Loading listings' })
    this.searchBox = page.getByRole('searchbox', { name: 'Search livestock' })
    this.searchButton = page.getByRole('search').getByRole('button', { name: 'Search' })
    this.sort = page.getByRole('combobox', { name: 'Sort by' })
    this.filtersToggle = page.getByRole('button', { name: /^Filters( \(\d+\))?$/ })
    this.category = page.getByRole('combobox', { name: 'Category' })
    this.breed = page.getByRole('combobox', { name: 'Breed' })
    this.minPrice = page.getByRole('spinbutton', { name: 'Min', exact: true })
    this.maxPrice = page.getByRole('spinbutton', { name: 'Max', exact: true })
    this.applyPrice = page.getByRole('button', { name: 'Apply price' })
    this.priceError = page.getByRole('group', { name: 'Price range (KES)' }).getByRole('alert')
    this.activeFilters = page.getByRole('list', { name: 'Active filters' }).getByRole('button')
    this.emptyState = this.results.getByRole('heading', { name: 'No livestock matches your search' })
    this.errorState = this.results.getByRole('alert').filter({ hasText: 'Listings could not be loaded' })
  }

  /** "Clear all filters" in the results area (the empty state's button). */
  get clearAllInResults(): Locator {
    return this.results.getByRole('button', { name: 'Clear all filters' })
  }

  removeFilter(label: string | RegExp): Locator {
    return this.activeFilters.filter({ hasText: label })
  }

  async openFilters(): Promise<void> {
    if (this.isMobile && (await this.filtersToggle.getAttribute('aria-expanded')) !== 'true') {
      await this.filtersToggle.click()
    }
  }

  async search(term: string): Promise<void> {
    await this.searchBox.fill(term)
    await this.searchButton.click()
  }

  async setPriceRange(min: string, max: string): Promise<void> {
    await this.openFilters()
    await this.minPrice.fill(min)
    await this.maxPrice.fill(max)
    await this.applyPrice.click()
  }
}
