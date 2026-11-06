import type { Locator, Page } from '@playwright/test'
import { BasePage } from './base.page'
import { ListingGrid } from './components/listing-grid'

/** /marketplace/:id. Reached by clicking a card, since ids come from the database. */
export class ListingDetailsPage extends BasePage {
  readonly path = '/marketplace/'
  readonly heading: Locator
  readonly breadcrumbMarketplace: Locator
  readonly price: Locator
  readonly factLabels: Locator
  readonly factValues: Locator
  readonly mainImage: Locator
  readonly thumbnails: Locator
  readonly inquiryButton: Locator
  readonly soldNotice: Locator
  readonly reservedNotice: Locator
  readonly sellerContact: Locator
  readonly notFound: Locator

  constructor(page: Page, isMobile: boolean) {
    super(page, isMobile)
    this.heading = page.getByRole('heading', { level: 1 })
    this.breadcrumbMarketplace = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Marketplace' })
    this.price = page.getByRole('main').getByText(/^Price: KES [\d,]+$/).first()
    // A <dl> has no role or accessible name, and related-listing cards contain their own terms.
    const facts = page.getByTestId('listing-facts')
    this.factLabels = facts.getByRole('term')
    this.factValues = facts.getByRole('definition')
    this.mainImage = page.getByRole('figure').getByRole('img')
    this.thumbnails = page.getByRole('list', { name: 'Choose image' }).getByRole('button')
    this.inquiryButton = page.getByRole('button', { name: 'Purchase Inquiry' })
    this.soldNotice = page.getByText('This animal has been sold and is no longer taking inquiries.')
    this.reservedNotice = page.getByText(/This animal is currently reserved/)
    this.sellerContact = page.getByRole('heading', { name: 'Seller contact' })
    this.notFound = page.getByRole('heading', { name: 'Listing not found' })
  }

  related(heading: string): ListingGrid {
    return new ListingGrid(this.page.getByRole('region', { name: heading }))
  }
}
