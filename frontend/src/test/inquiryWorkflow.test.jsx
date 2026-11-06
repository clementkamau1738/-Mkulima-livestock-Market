import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TEST_CUSTOMER, fakeApi } from './fakeApi'
import { renderRoute } from './renderRoute'

async function openInquiry(user) {
  await user.click(await screen.findByRole('button', { name: 'Purchase Inquiry' }))
  return screen.getByRole('dialog', { name: 'Purchase inquiry' })
}

function openInquiryRecord(overrides = {}) {
  return {
    reference: 'INQ-OPEN0001',
    listing: { id: 1, slug: 'lst-001', title: 'In-calf Friesian heifer' },
    full_name: 'Otieno Sample',
    phone: '+254712345678',
    email: '',
    message: 'Is she still available?',
    status: 'pending',
    created_at: '2026-10-21T10:00:00+03:00',
    history: [{ from_status: '', to_status: 'pending', reason: 'Submitted', created_at: '2026-10-21T10:00:00+03:00' }],
    ...overrides,
  }
}

describe('Inquiry follow-up for guests', () => {
  it('points a guest from the confirmation to tracking, which shows progress only', async () => {
    const { user, router } = renderRoute('/marketplace/1')
    const dialog = await openInquiry(user)
    await user.type(within(dialog).getByLabelText('Full name'), 'Wanjiku Test')
    await user.type(within(dialog).getByLabelText('Phone number'), '0712 345 678')
    await user.click(within(dialog).getByRole('button', { name: 'Send inquiry' }))

    const done = await screen.findByRole('dialog', { name: 'Inquiry submitted' })
    const reference = within(done).getByText(/^INQ-TEST\d{4}$/).textContent
    await user.click(within(done).getByRole('link', { name: 'Track an inquiry' }))

    expect(router.state.location.pathname).toBe('/track-inquiry')
    expect(await screen.findByLabelText('Reference number')).toHaveValue(reference)
    await user.type(screen.getByLabelText('Phone number'), '+254 712 345 678')
    await user.click(screen.getByRole('button', { name: 'Check status' }))

    const result = await screen.findByRole('region', { name: reference })
    expect(within(result).getByText('Pending review')).toBeInTheDocument()
    expect(within(result).getByRole('link', { name: 'In-calf Friesian heifer' })).toBeInTheDocument()
    expect(within(result).getByText(/will contact you/)).toBeInTheDocument()
    expect(fakeApi.requests.at(-1)).toMatchObject({ method: 'post', path: '/inquiries/track/', body: { reference, phone: '+254 712 345 678' } })
  })

  it('validates the lookup and shows the server answer when nothing matches', async () => {
    const { user } = renderRoute('/track-inquiry')
    await user.click(await screen.findByRole('button', { name: 'Check status' }))
    expect(screen.getByText('Enter the reference number from your confirmation')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Reference number'), 'DEP-123')
    await user.type(screen.getByLabelText('Phone number'), '0712345678')
    await user.click(screen.getByRole('button', { name: 'Check status' }))
    expect(screen.getByText('References look like INQ-7KQ2M9XP')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Reference number'))
    await user.type(screen.getByLabelText('Reference number'), 'INQ-ZZZZZZZZ')
    await user.click(screen.getByRole('button', { name: 'Check status' }))
    expect(await screen.findByText(/No inquiry matches that reference and phone number/)).toBeInTheDocument()
  })
})

describe('Inquiries for signed-in customers', () => {
  it('prefills the form from the account and points to the dashboard', async () => {
    fakeApi.signIn()
    const { user } = renderRoute('/marketplace/1')
    const dialog = await openInquiry(user)
    expect(within(dialog).getByLabelText('Full name')).toHaveValue(TEST_CUSTOMER.full_name)
    expect(within(dialog).getByLabelText('Phone number')).toHaveValue(TEST_CUSTOMER.phone)
    expect(within(dialog).getByLabelText(/Email/)).toHaveValue(TEST_CUSTOMER.email)

    await user.click(within(dialog).getByRole('button', { name: 'Send inquiry' }))
    const done = await screen.findByRole('dialog', { name: 'Inquiry submitted' })
    expect(within(done).getByRole('link', { name: 'your dashboard' })).toHaveAttribute('href', '/account?tab=inquiries')
    expect(within(done).queryByRole('link', { name: 'Track an inquiry' })).toBeNull()
  })

  it('shows a duplicate inquiry error from the server in the dialog', async () => {
    fakeApi.signIn()
    fakeApi.override('post', /^\/inquiries\/$/, () => ({
      status: 400,
      data: { error: { code: 'validation_error', message: 'x', fields: { listing: ['You already have an open inquiry for this animal (INQ-OPEN0001). Follow it on your dashboard.'] } } },
    }))
    const { user } = renderRoute('/marketplace/1')
    const dialog = await openInquiry(user)
    await user.click(within(dialog).getByRole('button', { name: 'Send inquiry' }))
    expect(await within(dialog).findByText(/already have an open inquiry for this animal \(INQ-OPEN0001\)/)).toBeInTheDocument()
  })

  it('lets the customer cancel an open inquiry from the dashboard', async () => {
    fakeApi.signIn()
    fakeApi.addRecord('inquiries', openInquiryRecord())
    const { user } = renderRoute('/account?tab=inquiries')

    await user.click(await screen.findByText('INQ-OPEN0001'))
    await user.click(screen.getByRole('button', { name: 'Cancel inquiry' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancel this inquiry?' })
    await user.type(within(dialog).getByLabelText(/Reason/), 'Bought elsewhere')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel inquiry' }))

    expect(await screen.findByText('Inquiry INQ-OPEN0001 cancelled')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    // The list reloads: cancelled badge plus the reason in the history, and no more cancel button.
    expect(await screen.findByText('Bought elsewhere')).toBeInTheDocument()
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Cancel inquiry' })).toBeNull()
    expect(fakeApi.requests.find((r) => r.path === '/inquiries/INQ-OPEN0001/cancel/')).toMatchObject({ method: 'post', body: { reason: 'Bought elsewhere' } })
  })

  it('offers no cancel button once an inquiry is closed', async () => {
    fakeApi.signIn()
    fakeApi.addRecord('inquiries', openInquiryRecord({ status: 'completed' }))
    const { user } = renderRoute('/account?tab=inquiries')
    await user.click(await screen.findByText('INQ-OPEN0001'))
    expect(screen.getByRole('link', { name: 'View listing' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel inquiry' })).toBeNull()
  })
})
