import type { Page } from '@playwright/test'
import { Navbar } from './components/navbar'

export abstract class BasePage {
  readonly navbar: Navbar

  constructor(
    protected readonly page: Page,
    protected readonly isMobile: boolean,
  ) {
    this.navbar = new Navbar(page, isMobile)
  }

  abstract readonly path: string

  async goto(query = ''): Promise<void> {
    await this.page.goto(this.path + query)
  }
}
