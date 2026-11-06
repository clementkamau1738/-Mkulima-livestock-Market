import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/base.fixture'
import { LISTINGS } from '../helpers/sample-data'
import type { MarketplacePage } from '../pages/marketplace.page'

/** Listing ids come from the database, so reach a listing the way a buyer does: search, then click. */
async function openListing(page: Page, market: MarketplacePage, title: string) {
  await market.goto(`?q=${encodeURIComponent(title)}`)
  await market.grid.card(title).getByRole('link', { name: title }).click()
  await expect(page).toHaveURL(/\/marketplace\/\d+$/)
}

test.describe('Listing details', () => {
  test('shows the facts, price and gallery for a listing @smoke', async ({ page, marketplacePage, listingPage }) => {
    const bull = LISTINGS.friesianBull
    await openListing(page, marketplacePage, bull.title)

    await expect(page).toHaveTitle(`${bull.title} | Mkulima Livestock Market`)
    await expect(listingPage.heading).toHaveText(bull.title)
    await expect(listingPage.price).toHaveText(`Price: ${bull.price}`)
    await expect(listingPage.factLabels).toHaveText(bull.facts.map(([label]) => label))
    await expect(listingPage.factValues).toHaveText(bull.facts.map(([, value]) => value))
    await expect(listingPage.thumbnails).toHaveCount(bull.imageCount)
    await expect(listingPage.inquiryButton).toBeEnabled()
  })

  test('gallery thumbnails switch the main photo', async ({ page, marketplacePage, listingPage }) => {
    await openListing(page, marketplacePage, LISTINGS.friesianBull.title)
    const [first, second] = [listingPage.thumbnails.nth(0), listingPage.thumbnails.nth(1)]
    await expect(first).toHaveAttribute('aria-pressed', 'true')
    const firstSrc = await listingPage.mainImage.getAttribute('src')

    await second.click()

    await expect(second).toHaveAttribute('aria-pressed', 'true')
    await expect(first).toHaveAttribute('aria-pressed', 'false')
    await expect(listingPage.mainImage).not.toHaveAttribute('src', firstSrc ?? '')
  })

  test('facts missing from the data are not shown', async ({ page, marketplacePage, listingPage }) => {
    await openListing(page, marketplacePage, LISTINGS.sahiwalBull.title)

    await expect(listingPage.factLabels).toHaveText([...LISTINGS.sahiwalBull.factLabels])
  })

  test('seller contact details are never shown publicly', async ({ page, marketplacePage, listingPage }) => {
    await openListing(page, marketplacePage, LISTINGS.friesianBull.title)

    await expect(listingPage.sellerContact).toBeVisible()
    await expect(page.getByRole('main')).toContainText('They are never shown publicly.')
    await expect(page.getByRole('main').getByRole('link', { name: /^(tel:|\+254|07\d)/ })).toHaveCount(0)
  })

  test('related listings come from the same category', async ({ page, marketplacePage, listingPage }) => {
    const bull = LISTINGS.friesianBull
    await openListing(page, marketplacePage, bull.title)

    const related = listingPage.related(bull.relatedHeading)
    await expect(related.titles).toHaveText([...bull.relatedTitles])

    await related.card(bull.relatedTitles[0]).getByRole('link').click()
    await expect(listingPage.heading).toHaveText(bull.relatedTitles[0])
  })

  test('a sold animal cannot be inquired about', async ({ page, marketplacePage, listingPage }) => {
    await openListing(page, marketplacePage, LISTINGS.soldCalf.title)

    await expect(listingPage.soldNotice).toBeVisible()
    await expect(listingPage.inquiryButton).toHaveCount(0)
  })

  test('a reserved animal explains its status but still takes inquiries', async ({ page, marketplacePage, listingPage }) => {
    await openListing(page, marketplacePage, LISTINGS.reservedCow.title)

    await expect(listingPage.reservedNotice).toBeVisible()
    await expect(listingPage.inquiryButton).toBeVisible()
  })

  test('the breadcrumb returns to the marketplace', async ({ page, marketplacePage, listingPage }) => {
    await openListing(page, marketplacePage, LISTINGS.friesianBull.title)

    await listingPage.breadcrumbMarketplace.click()

    await expect(page).toHaveURL('/marketplace')
  })

  test('an unknown listing shows "not found" with a way back', async ({ page, listingPage }) => {
    await listingPage.goto('999999')

    await expect(listingPage.notFound).toBeVisible()
    await page.getByRole('link', { name: 'Back to marketplace' }).click()
    await expect(page).toHaveURL('/marketplace')
  })
})
