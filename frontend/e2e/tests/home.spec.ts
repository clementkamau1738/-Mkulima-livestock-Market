import { expect, test } from '../fixtures/base.fixture'
import { CATEGORY_NAMES, FEATURED_TITLES, KIAMBU_TITLES } from '../helpers/sample-data'

test.describe('Homepage', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto()
  })

  test('shows the hero, featured listings and categories @smoke', async ({ page, homePage }) => {
    await expect(page).toHaveTitle('Mkulima Livestock Market')
    await expect(homePage.heading).toContainText('Find the right animal for your farm')
    await expect(homePage.featured.titles).toHaveText(FEATURED_TITLES)
    await expect(homePage.featured.cards.getByText('Available', { exact: true })).toHaveCount(FEATURED_TITLES.length)
    await expect(homePage.categories.getByRole('heading')).toHaveText(CATEGORY_NAMES)
  })

  test('hero search opens the marketplace with the keyword applied', async ({ page, homePage, marketplacePage }) => {
    await homePage.search('Kiambu')

    await expect(page).toHaveURL('/marketplace?q=Kiambu')
    await expect(marketplacePage.searchBox).toHaveValue('Kiambu')
    await expect(marketplacePage.grid.titles).toHaveText(KIAMBU_TITLES)
  })

  test('a category card opens the marketplace filtered to that category', async ({ page, homePage, marketplacePage }) => {
    await homePage.category('Bulls').click()

    await expect(page).toHaveURL('/marketplace?category=bulls')
    await expect(marketplacePage.summary).toHaveText('3 listings')
    await expect(marketplacePage.removeFilter('Bulls')).toBeVisible()
  })

  test('a featured card opens its details page', async ({ page, homePage, listingPage }) => {
    await homePage.featured.card(FEATURED_TITLES[0]).getByRole('link').click()

    await expect(page).toHaveURL(/\/marketplace\/\d+$/)
    await expect(listingPage.heading).toHaveText(FEATURED_TITLES[0])
  })

  test('the hero "Browse Livestock" button opens the marketplace', async ({ page, homePage, marketplacePage }) => {
    await homePage.browseLivestock.click()

    await expect(page).toHaveURL('/marketplace')
    await expect(marketplacePage.summary).toHaveText('14 listings · page 1 of 2')
  })

  test('the navbar reaches the marketplace on every screen size', async ({ page, homePage }) => {
    await homePage.navbar.open('Marketplace')

    await expect(page).toHaveURL('/marketplace')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Browse livestock')
  })
})
