import { test as base } from '@playwright/test'
import { HomePage } from '../pages/home.page'
import { ListingDetailsPage } from '../pages/listing-details.page'
import { MarketplacePage } from '../pages/marketplace.page'

type Pages = {
  homePage: HomePage
  marketplacePage: MarketplacePage
  listingPage: ListingDetailsPage
}

export const test = base.extend<Pages>({
  homePage: async ({ page, isMobile }, use) => {
    await use(new HomePage(page, isMobile))
  },
  marketplacePage: async ({ page, isMobile }, use) => {
    await use(new MarketplacePage(page, isMobile))
  },
  listingPage: async ({ page, isMobile }, use) => {
    await use(new ListingDetailsPage(page, isMobile))
  },
})

export { expect } from '@playwright/test'
