import type { Locator, Page } from '@playwright/test'

/** Site header. Below the lg breakpoint its links sit behind the menu button. */
export class Navbar {
  readonly root: Locator
  readonly menuButton: Locator

  constructor(
    page: Page,
    private readonly isMobile: boolean,
  ) {
    this.root = page.getByRole('banner')
    this.menuButton = this.root.getByRole('button', { name: /^(Open|Close) menu$/ })
  }

  link(name: string): Locator {
    return this.root.getByRole('link', { name, exact: true })
  }

  async open(name: string): Promise<void> {
    if (this.isMobile) await this.menuButton.click()
    await this.link(name).click()
  }
}
