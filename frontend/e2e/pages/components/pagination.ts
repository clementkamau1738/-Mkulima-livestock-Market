import type { Locator } from '@playwright/test'

export class Pagination {
  readonly root: Locator
  readonly previous: Locator
  readonly next: Locator

  constructor(scope: Locator) {
    this.root = scope.getByRole('navigation', { name: 'Pagination' })
    this.previous = this.root.getByRole('button', { name: 'Previous page' })
    this.next = this.root.getByRole('button', { name: 'Next page' })
  }

  page(n: number): Locator {
    return this.root.getByRole('button', { name: `Page ${n}`, exact: true })
  }
}
