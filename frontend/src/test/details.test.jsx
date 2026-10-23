import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from './renderRoute'

const factsList = () => screen.getAllByRole('term').map((t) => t.textContent)

describe('LivestockDetails', () => {
  it('shows the selected listing with its facts and gallery', async () => {
    const { user } = renderRoute('/marketplace/1')
    expect(await screen.findByRole('heading', { level: 1, name: 'In-calf Friesian heifer' })).toBeInTheDocument()
    expect(screen.getAllByText('KES 165,000').length).toBeGreaterThan(0)
    expect(factsList()).toEqual(expect.arrayContaining(['Breed', 'Category', 'Sex', 'Age', 'Weight', 'Location']))
    expect(screen.getByText('2 years, 2 months')).toBeInTheDocument()

    const thumb = screen.getByRole('button', { name: 'Show image 2 of 3' })
    await user.click(thumb)
    expect(thumb).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('img', { name: /in the paddock/ })).toBeInTheDocument()
  })

  it('omits fields the listing does not have', async () => {
    renderRoute('/marketplace/9')
    await screen.findByRole('heading', { level: 1, name: 'Sahiwal bull' })
    const terms = factsList()
    expect(terms).not.toContain('Age')
    expect(terms).not.toContain('Weight')
  })

  it('never shows seller contact details publicly', async () => {
    renderRoute('/marketplace/1')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByRole('heading', { name: 'Seller contact' }).parentElement).toHaveTextContent(/shared only with buyers/i)
  })

  it('shows related listings from the same category', async () => {
    renderRoute('/marketplace/7')
    const related = await screen.findByRole('region', { name: /similar bulls listings/i })
    const titles = within(related).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(expect.arrayContaining(['Friesian bull', 'Sahiwal bull']))
    expect(titles).not.toContain('Boran breeding bull')
  })

  it('shows a not-found state for unknown listings', async () => {
    renderRoute('/marketplace/nope')
    expect(await screen.findByRole('heading', { name: 'Listing not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to marketplace' })).toHaveAttribute('href', '/marketplace')
  })

  it('does not offer an inquiry on sold listings', async () => {
    renderRoute('/marketplace/11')
    await screen.findByRole('heading', { level: 1, name: 'Ayrshire bull calf' })
    expect(screen.queryByRole('button', { name: 'Purchase Inquiry' })).toBeNull()
    expect(screen.getByText('This animal has been sold and is no longer taking inquiries.')).toBeInTheDocument()
  })

  it('validates and submits a purchase inquiry as pending', async () => {
    const { user } = renderRoute('/marketplace/1')
    await user.click(await screen.findByRole('button', { name: 'Purchase Inquiry' }))
    const dialog = screen.getByRole('dialog', { name: 'Purchase inquiry' })

    await user.click(within(dialog).getByRole('button', { name: 'Send inquiry' }))
    expect(within(dialog).getByText('Enter your full name')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter your phone number')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Full name'), 'Wanjiku Test')
    await user.type(within(dialog).getByLabelText('Phone number'), '12345')
    await user.click(within(dialog).getByRole('button', { name: 'Send inquiry' }))
    expect(within(dialog).getByText(/valid Kenyan phone number/)).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText('Phone number'))
    await user.type(within(dialog).getByLabelText('Phone number'), '0712 345 678')
    await user.click(within(dialog).getByRole('button', { name: 'Send inquiry' }))

    const done = await screen.findByRole('dialog', { name: 'Inquiry submitted' })
    expect(within(done).getByText(/^INQ-TEST\d{4}$/)).toBeInTheDocument()
    expect(within(done).getByText('Reference number')).toBeInTheDocument()
    expect(within(done).getByText('Pending review')).toBeInTheDocument()
    expect(within(done).getByText(/does not reserve or purchase/)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
