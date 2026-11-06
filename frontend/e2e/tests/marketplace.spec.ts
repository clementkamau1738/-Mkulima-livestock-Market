import { expect, test } from '../fixtures/base.fixture'
import {
  BULLS_BY_PRICE_DESC,
  FRIESIAN_BREED_TITLES,
  PAGE_SIZE,
  PRICE_90K_TO_100K_TITLES,
  TITLES_NEWEST_FIRST,
  TOTAL_LISTINGS,
} from '../helpers/sample-data'

const LIST_API = /\/api\/livestock\/(\?.*)?$/

test.describe('Marketplace browsing', () => {
  test('lists every published animal, newest first, across two pages @smoke', async ({ marketplacePage: market }) => {
    await market.goto()

    await expect(market.summary).toHaveText(`${TOTAL_LISTINGS} listings · page 1 of 2`)
    await expect(market.grid.titles).toHaveText(TITLES_NEWEST_FIRST.slice(0, PAGE_SIZE))
    await expect(market.grid.cards.first()).toContainText('Bulls · Boran')
    await expect(market.grid.cards.first()).toContainText('Narok')
    await expect(market.grid.cards.first()).toContainText('KES 260,000')
    await expect(market.grid.card('Ayrshire bull calf')).toHaveCount(0) // sold, on page 2
  })

  test('pagination moves between pages and keeps the page in the URL', async ({ page, marketplacePage: market }) => {
    await market.goto()
    await expect(market.pagination.previous).toBeDisabled()

    await market.pagination.next.click()

    await expect(page).toHaveURL('/marketplace?page=2')
    await expect(market.summary).toHaveText(`${TOTAL_LISTINGS} listings · page 2 of 2`)
    await expect(market.grid.titles).toHaveText(TITLES_NEWEST_FIRST.slice(PAGE_SIZE))
    await expect(market.pagination.page(2)).toHaveAttribute('aria-current', 'page')
    await expect(market.pagination.next).toBeDisabled()
    await expect(market.grid.card('Ayrshire bull calf').getByText('Sold', { exact: true })).toBeVisible()

    await market.pagination.page(1).click()
    await expect(page).toHaveURL('/marketplace')
    await expect(market.grid.titles).toHaveText(TITLES_NEWEST_FIRST.slice(0, PAGE_SIZE))
  })

  test('sorting by price works in both directions', async ({ page, marketplacePage: market }) => {
    await market.goto()

    await market.sort.selectOption({ label: 'Price: low to high' })
    await expect(page).toHaveURL('/marketplace?sort=price_asc')
    await expect(market.grid.titles.first()).toHaveText('Ayrshire bull calf')
    const ascending = await market.grid.priceValues()
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b))

    await market.sort.selectOption({ label: 'Price: high to low' })
    await expect(page).toHaveURL('/marketplace?sort=price_desc')
    await expect(market.grid.titles.first()).toHaveText('Boran breeding bull')
    const descending = await market.grid.priceValues()
    expect(descending).toEqual([...descending].sort((a, b) => b - a))
  })

  test('keyword search filters results and shows a removable chip', async ({ page, marketplacePage: market }) => {
    await market.goto()

    await market.search('Boran')

    await expect(page).toHaveURL('/marketplace?q=Boran')
    await expect(market.grid.titles).toHaveText(['Boran breeding bull', 'Boran steer for finishing'])

    await market.removeFilter('“Boran”').click()
    await expect(page).toHaveURL('/marketplace')
    await expect(market.searchBox).toHaveValue('')
    await expect(market.summary).toHaveText(`${TOTAL_LISTINGS} listings · page 1 of 2`)
  })

  test('category and breed filters narrow the results', async ({ page, marketplacePage: market }) => {
    await market.goto()
    await market.openFilters()

    await market.breed.selectOption('Friesian')
    await expect(page).toHaveURL('/marketplace?breed=Friesian')
    await expect(market.grid.titles).toHaveText(FRIESIAN_BREED_TITLES)

    await market.category.selectOption({ label: 'Bulls' })
    await expect(page).toHaveURL('/marketplace?category=bulls&breed=Friesian')
    await expect(market.grid.titles).toHaveText(['Friesian bull'])
    await expect(market.activeFilters).toHaveText(['Bulls', 'Friesian'])
  })

  test('price range filter applies inclusive bounds', async ({ page, marketplacePage: market }) => {
    await market.goto()

    await market.setPriceRange('90000', '100000')

    await expect(page).toHaveURL('/marketplace?minPrice=90000&maxPrice=100000')
    await expect(market.grid.titles).toHaveText(PRICE_90K_TO_100K_TITLES)
    await expect(market.activeFilters).toHaveText(['From KES 90,000', 'Up to KES 100,000'])
  })

  test('an inverted price range is rejected before searching', async ({ page, marketplacePage: market }) => {
    await market.goto()

    await market.setPriceRange('200000', '100000')

    await expect(market.priceError).toHaveText('Minimum price cannot be more than the maximum')
    await expect(page).toHaveURL('/marketplace')
    await expect(market.summary).toHaveText(`${TOTAL_LISTINGS} listings · page 1 of 2`)
  })

  test('changing a filter resets to page 1', async ({ page, marketplacePage: market }) => {
    await market.goto('?page=2')
    await expect(market.pagination.page(2)).toHaveAttribute('aria-current', 'page')

    await market.sort.selectOption('price_desc')

    await expect(page).toHaveURL('/marketplace?sort=price_desc')
    await expect(market.pagination.page(1)).toHaveAttribute('aria-current', 'page')
  })

  test('no matches shows the empty state, and clearing filters recovers', async ({ page, marketplacePage: market }) => {
    await market.goto('?q=zebra')

    await expect(market.emptyState).toBeVisible()
    await expect(market.grid.cards).toHaveCount(0)

    await market.clearAllInResults.click()
    await expect(page).toHaveURL('/marketplace')
    await expect(market.grid.cards).toHaveCount(PAGE_SIZE)
  })
})

test.describe('Marketplace URL state', () => {
  test('a shared link restores filters, sort and results', async ({ marketplacePage: market }) => {
    await market.goto('?category=bulls&sort=price_desc')
    await market.openFilters()

    await expect(market.category).toHaveValue('bulls')
    await expect(market.sort).toHaveValue('price_desc')
    await expect(market.grid.titles).toHaveText(BULLS_BY_PRICE_DESC)
  })

  test('filters survive a reload and the back button undoes them', async ({ page, marketplacePage: market }) => {
    await market.goto()
    await expect(market.grid.cards).toHaveCount(PAGE_SIZE)
    await market.search('Sahiwal')
    await expect(market.grid.titles).toHaveText(['Sahiwal-cross steer', 'Sahiwal bull'])

    await page.reload()
    await expect(market.searchBox).toHaveValue('Sahiwal')
    await expect(market.grid.titles).toHaveText(['Sahiwal-cross steer', 'Sahiwal bull'])

    await page.goBack()
    await expect(page).toHaveURL('/marketplace')
    await expect(market.searchBox).toHaveValue('')
    await expect(market.summary).toHaveText(`${TOTAL_LISTINGS} listings · page 1 of 2`)
  })

  test('invalid query values fall back to defaults', async ({ marketplacePage: market }) => {
    await market.goto('?sort=cheapest&page=abc&minPrice=-5')

    await expect(market.sort).toHaveValue('newest')
    await expect(market.summary).toHaveText(`${TOTAL_LISTINGS} listings · page 1 of 2`)
    await expect(market.activeFilters).toHaveCount(0)
  })
})

test.describe('Marketplace loading and errors', () => {
  test('shows loading skeletons until listings arrive', async ({ page, marketplacePage: market }) => {
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route(LIST_API, async (route) => {
      await held
      await route.continue()
    })

    await market.goto()
    await expect(market.skeleton).toBeVisible()
    await expect(market.grid.cards).toHaveCount(0)

    release()
    await expect(market.skeleton).toBeHidden()
    await expect(market.grid.cards).toHaveCount(PAGE_SIZE)
  })

  test('a server error shows a retryable error state', async ({ marketplacePage: market, page }) => {
    // Fail every list request until the retry: React StrictMode fires the first load twice in development.
    let failing = true
    await page.route(LIST_API, (route) =>
      failing ? route.fulfill({ status: 500, json: { error: { code: 'server_error', message: 'Server error' } } }) : route.continue(),
    )

    await market.goto()
    await expect(market.errorState).toBeVisible()

    failing = false
    await market.errorState.getByRole('button', { name: 'Try again' }).click()
    await expect(market.errorState).toBeHidden()
    await expect(market.grid.cards).toHaveCount(PAGE_SIZE)
  })
})

test.describe('Marketplace on phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'The filter toggle only exists below the lg breakpoint')

  test('filters sit behind a toggle that shows how many are active', async ({ marketplacePage: market }) => {
    await market.goto('?category=dairy')

    await expect(market.filtersToggle).toHaveText('Filters (1)')
    await expect(market.filtersToggle).toHaveAttribute('aria-expanded', 'false')
    await expect(market.category).toBeHidden()

    await market.filtersToggle.click()
    await expect(market.filtersToggle).toHaveAttribute('aria-expanded', 'true')
    await expect(market.category).toHaveValue('dairy')
  })
})
