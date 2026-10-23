import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TEST_ADMIN, TEST_STAFF, fakeApi } from './fakeApi'
import { renderRoute } from './renderRoute'

const page = (results) => ({ status: 200, data: { count: results.length, page: 1, total_pages: 1, results } })

function deposit(overrides = {}) {
  return {
    reference: 'DEP-REVW0001',
    user: { id: 7, email: 'otieno@example.test', full_name: 'Otieno Sample' },
    full_name: 'Otieno Sample',
    phone: '+254712345678',
    amount: '5000.00',
    payment_reference: 'TJK4ABC123',
    notes: '',
    status: 'pending',
    reviewer: null,
    reviewed_at: null,
    review_note: '',
    created_at: '2026-10-20T10:00:00+03:00',
    updated_at: '2026-10-20T10:00:00+03:00',
    allowed_transitions: ['approved', 'rejected'],
    transaction: null,
    history: [{ from_status: '', to_status: 'pending', reason: 'Submitted', created_at: '2026-10-20T10:00:00+03:00', changed_by: null }],
    ...overrides,
  }
}

const transitionPosts = () => fakeApi.requests.filter((r) => r.method === 'post' && r.path.endsWith('/transition/'))

describe('Staff admin', () => {
  // The admin area is lazy-loaded; compile it once up front so the first test
  // is not timed against module transformation.
  beforeAll(async () => {
    await Promise.all(Object.values(import.meta.glob(['../layouts/AdminLayout.jsx', '../pages/admin/*.jsx'])).map((load) => load()))
  })

  beforeEach(() => {
    fakeApi.signIn(TEST_STAFF)
  })

  it('shows live summary counts with links to the queues', async () => {
    fakeApi.override('get', /^\/admin\/summary\/$/, () => ({
      status: 200,
      data: {
        listings: { available: 9, draft: 2 },
        inquiries: { pending: 4 },
        deposits: { pending: 3, approved: 1 },
        withdrawals: { approved: 1, processing: 1 },
        customers: { total: 12, active: 11 },
      },
    }))
    renderRoute('/admin')
    // First render in this file also warms up the router and lazy routes.
    const pending = await screen.findByRole('link', { name: /pending deposits/i }, { timeout: 10000 })
    expect(pending).toHaveTextContent('3')
    expect(pending).toHaveAttribute('href', '/admin/deposits?status=pending')
    expect(screen.getByRole('link', { name: /payouts to send or confirm/i })).toHaveTextContent('2')
  })

  it('approves a deposit only after the reviewer confirms the statement check', async () => {
    let current = deposit()
    fakeApi.override('get', /^\/admin\/deposits\/DEP-REVW0001\/$/, () => ({ status: 200, data: current }))
    fakeApi.override('post', /^\/admin\/deposits\/DEP-REVW0001\/transition\/$/, ({ body }) => {
      current = deposit({ status: body.status, allowed_transitions: [], transaction: { reference: 'TXN-AAAA1111', external_reference: 'TJK4ABC123' } })
      return { status: 200, data: current }
    })
    const { user } = renderRoute('/admin/deposits/DEP-REVW0001')
    await user.click(await screen.findByRole('button', { name: 'Approve deposit' }))
    const dialog = screen.getByRole('dialog', { name: 'Approve deposit' })
    await user.click(within(dialog).getByRole('button', { name: 'Approve deposit' }))
    expect(within(dialog).getByText('Confirm the check before continuing')).toBeInTheDocument()
    expect(transitionPosts()).toHaveLength(0)

    await user.click(within(dialog).getByRole('checkbox'))
    await user.click(within(dialog).getByRole('button', { name: 'Approve deposit' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(transitionPosts()[0].body).toEqual({ status: 'approved', reason: '', confirmed: true, external_reference: '' })
    expect(await screen.findByText(/This record is in a final state/)).toBeInTheDocument()
    expect(screen.getByText(/TXN-AAAA1111/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull()
  })

  it('requires a reason to reject and shows server conflicts', async () => {
    fakeApi.override('get', /^\/admin\/deposits\/DEP-REVW0001\/$/, () => ({ status: 200, data: deposit() }))
    fakeApi.override('post', /transition\/$/, () => ({
      status: 409,
      data: { error: { code: 'invalid_transition', message: 'A deposit that is approved cannot be moved to rejected.' } },
    }))
    const { user } = renderRoute('/admin/deposits/DEP-REVW0001')
    await user.click(await screen.findByRole('button', { name: 'Reject' }))
    const dialog = screen.getByRole('dialog', { name: 'Reject' })
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }))
    expect(within(dialog).getByText('Give a reason the customer can read')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/Reason or note/), 'No matching payment found')
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }))
    expect(await within(dialog).findByText('A deposit that is approved cannot be moved to rejected.')).toBeInTheDocument()
  })

  it('asks for the payout reference when completing a withdrawal', async () => {
    const withdrawal = {
      ...deposit({ reference: 'WDR-PAY00001', allowed_transitions: ['completed', 'failed'], status: 'processing' }),
      method: 'mpesa',
      destination: 'M-Pesa ending 432',
      mpesa_number: '+254798765432',
      bank_name: '',
      account_name: '',
      account_number: '',
      reason: '',
    }
    fakeApi.override('get', /^\/admin\/withdrawals\/WDR-PAY00001\/$/, () => ({ status: 200, data: withdrawal }))
    fakeApi.override('post', /transition\/$/, () => ({ status: 200, data: { ...withdrawal, status: 'completed', allowed_transitions: [] } }))
    const { user } = renderRoute('/admin/withdrawals/WDR-PAY00001')
    expect(await screen.findByText('+254798765432')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark payout completed' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox'))
    await user.click(within(dialog).getByRole('button', { name: 'Mark payout completed' }))
    expect(within(dialog).getByText('Enter the payout reference')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Payout reference'), 'SFC12345XY')
    await user.click(within(dialog).getByRole('button', { name: 'Mark payout completed' }))
    await waitFor(() => expect(transitionPosts()).toHaveLength(1))
    expect(transitionPosts()[0].body).toMatchObject({ status: 'completed', confirmed: true, external_reference: 'SFC12345XY' })
  })

  it('keeps table filters in the URL and sends them to the API', async () => {
    fakeApi.override('get', /^\/admin\/deposits\/$/, () => page([deposit()]))
    const { user, router } = renderRoute('/admin/deposits')
    expect(await screen.findByRole('link', { name: 'DEP-REVW0001' })).toHaveAttribute('href', '/admin/deposits/DEP-REVW0001')
    await user.selectOptions(screen.getByLabelText('Status'), 'pending')
    await user.type(screen.getByRole('searchbox'), 'otieno')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(router.state.location.search).toBe('?q=otieno&status=pending'))
    const last = fakeApi.requests.filter((r) => r.path === '/admin/deposits/').at(-1)
    expect(last.params).toMatchObject({ q: 'otieno', status: 'pending', page: 1 })
  })

  it('checks photo type and size before uploading', async () => {
    fakeApi.override('get', /^\/admin\/livestock\/5\/$/, () => ({
      status: 200,
      data: {
        id: 5,
        slug: 'heifer',
        title: 'Friesian heifer',
        breed: 'Friesian',
        category: { slug: 'dairy', name: 'Dairy' },
        sex: 'female',
        age_months: 24,
        weight_kg: null,
        location: 'Nakuru',
        price_kes: '150000.00',
        status: 'draft',
        published_at: null,
        description: 'A fictional test animal for the admin screen.',
        images: [],
        primary_image: null,
        allowed_transitions: ['available', 'archived'],
        image_count: 0,
        created_at: '2026-10-20T10:00:00+03:00',
        updated_at: '2026-10-20T10:00:00+03:00',
      },
    }))
    const { user } = renderRoute('/admin/listings/5')
    const input = await screen.findByLabelText('Photo file')
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()

    fireEvent.change(input, { target: { files: [new File(['GIF89a'], 'cow.gif', { type: 'image/gif' })] } })
    await user.click(screen.getByRole('button', { name: 'Upload photo' }))
    expect(await screen.findByText('Use a JPEG, PNG or WebP photo.')).toBeInTheDocument()

    fireEvent.change(input, { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' })] } })
    await user.click(screen.getByRole('button', { name: 'Upload photo' }))
    expect(await screen.findByText('Photos must be 5 MB or smaller.')).toBeInTheDocument()
    expect(fakeApi.requests.some((r) => r.method === 'post' && r.path.includes('/images/'))).toBe(false)
  })

  it('offers account suspension to administrators only', async () => {
    const accounts = page([{ id: 7, email: 'otieno@example.test', full_name: 'Otieno Sample', phone: '', role: 'customer', is_active: true, date_joined: '2026-10-01T09:00:00+03:00' }])
    fakeApi.override('get', /^\/admin\/accounts\/$/, () => accounts)
    renderRoute('/admin/customers')
    expect(await screen.findByText('otieno@example.test')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /suspend/i })).toBeNull()
  })

  it('lets an administrator suspend with a reason', async () => {
    fakeApi.signIn(TEST_ADMIN)
    const row = { id: 7, email: 'otieno@example.test', full_name: 'Otieno Sample', phone: '', role: 'customer', is_active: true, date_joined: '2026-10-01T09:00:00+03:00' }
    fakeApi.override('get', /^\/admin\/accounts\/$/, () => page([row]))
    fakeApi.override('post', /^\/admin\/accounts\/7\/access\/$/, () => ({ status: 200, data: { ...row, is_active: false } }))
    const { user } = renderRoute('/admin/customers')
    await user.click(await screen.findByRole('button', { name: /suspend otieno@example.test/i }))
    const dialog = screen.getByRole('dialog', { name: 'Suspend account' })
    await user.type(within(dialog).getByLabelText('Reason'), 'Reported fraud attempt')
    await user.click(within(dialog).getByRole('button', { name: 'Suspend account' }))
    await waitFor(() => expect(fakeApi.requests.some((r) => r.path === '/admin/accounts/7/access/')).toBe(true))
    expect(fakeApi.requests.find((r) => r.path === '/admin/accounts/7/access/').body).toEqual({ is_active: false, reason: 'Reported fraud attempt' })
  })
})
