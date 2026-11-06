import type { Locator } from '@playwright/test'

/** A grid of listing cards (marketplace results, featured, related). */
export class ListingGrid {
  readonly cards: Locator
  readonly titles: Locator
  readonly prices: Locator

  constructor(root: Locator) {
    this.cards = root.getByRole('article')
    this.titles = this.cards.getByRole('heading', { level: 3 })
    this.prices = this.cards.getByText(/^Price: KES [\d,]+$/)
  }

  card(title: string): Locator {
    // `has` is evaluated inside each card, so it must not start from the grid root.
    return this.cards.filter({ has: this.cards.page().getByRole('heading', { level: 3, name: title, exact: true }) })
  }

  /** Card prices as numbers, in display order. */
  async priceValues(): Promise<number[]> {
    const texts = await this.prices.allInnerTexts()
    return texts.map((t) => Number(t.replace(/\D/g, '')))
  }
}
