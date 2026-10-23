import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fakeApi } from './fakeApi'
import { renderRoute } from './renderRoute'

const DEPOSITS = /^\/deposits\/$/

async function fillDeposit(user, reference = 'TJK4ABC123') {
  await screen.findByRole('region', { name: 'How to pay a deposit' })
  await user.type(await screen.findByLabelText('Amount'), '5000')
  await user.type(screen.getByLabelText('Payment reference'), reference)
  await user.click(screen.getByRole('checkbox'))
}

const depositPosts = () => fakeApi.requests.filter((r) => r.method === 'post' && r.path === '/deposits/')

describe('Deposit submission against the API', () => {
  beforeEach(() => {
    fakeApi.signIn()
  })

  it('sends the API payload with an idempotency key and shows the real reference', async () => {
    const { user } = renderRoute('/deposit')
    await fillDeposit(user)
    await user.click(screen.getByRole('button', { name: 'Submit deposit request' }))

    expect(await screen.findByText('DEP-TEST0001')).toBeInTheDocument()
    expect(screen.getByText('Reference number')).toBeInTheDocument()
    const [request] = depositPosts()
    expect(request.body).toEqual({
      full_name: 'Otieno Sample',
      phone: '+254712345678',
      amount: '5000',
      payment_reference: 'TJK4ABC123',
      notes: '',
    })
    expect(request.headers['Idempotency-Key']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('shows server field errors next to the right inputs', async () => {
    fakeApi.override('post', DEPOSITS, () => ({
      status: 400,
      data: {
        error: {
          code: 'validation_error',
          message: 'Some of the information provided is not valid.',
          fields: { payment_reference: ['This payment reference has already been submitted.'], phone: ['Enter a valid Kenyan phone number.'] },
        },
      },
    }))
    const { user } = renderRoute('/deposit')
    await fillDeposit(user)
    await user.click(screen.getByRole('button', { name: 'Submit deposit request' }))

    const reference = screen.getByLabelText('Payment reference')
    await waitFor(() => expect(reference).toHaveAttribute('aria-invalid', 'true'))
    expect(reference).toHaveAccessibleDescription('This payment reference has already been submitted.')
    expect(screen.getByLabelText('Phone number')).toHaveAccessibleDescription('Enter a valid Kenyan phone number.')
    expect(screen.getByText('Please correct the highlighted fields.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Deposit request submitted' })).toBeNull()
  })

  it('reuses the same idempotency key when retrying after a network failure', async () => {
    fakeApi.override('post', DEPOSITS, () => ({ networkError: true }), { once: true })
    const { user } = renderRoute('/deposit')
    await fillDeposit(user)
    const submit = screen.getByRole('button', { name: 'Submit deposit request' })
    await user.click(submit)
    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument()

    await user.click(submit)
    expect(await screen.findByText('DEP-TEST0001')).toBeInTheDocument()
    const [first, retry] = depositPosts()
    expect(retry.headers['Idempotency-Key']).toBe(first.headers['Idempotency-Key'])
  })

  it('sends one request for a double click', async () => {
    let release
    fakeApi.override('post', DEPOSITS, () => new Promise((resolve) => (release = resolve)), { once: true })
    const { user } = renderRoute('/deposit')
    await fillDeposit(user)
    const submit = screen.getByRole('button', { name: 'Submit deposit request' })
    await user.dblClick(submit)
    await waitFor(() => expect(submit).toBeDisabled())
    expect(submit).toHaveTextContent(/Submitting/)
    await user.click(submit)
    release({ status: 201, data: { reference: 'DEP-ONCE0001', status: 'pending', created_at: '2026-10-21T10:00:00+03:00' } })
    expect(await screen.findByText('DEP-ONCE0001')).toBeInTheDocument()
    expect(depositPosts()).toHaveLength(1)
  })

  it('starts a new submission with a new key after success', async () => {
    const { user } = renderRoute('/deposit')
    await fillDeposit(user, 'FIRST00001')
    await user.click(screen.getByRole('button', { name: 'Submit deposit request' }))
    await user.click(await screen.findByRole('button', { name: 'Submit another request' }))
    await fillDeposit(user, 'SECOND0002')
    await user.click(screen.getByRole('button', { name: 'Submit deposit request' }))
    expect(await screen.findByText('DEP-TEST0002')).toBeInTheDocument()
    const [a, b] = depositPosts()
    expect(a.headers['Idempotency-Key']).not.toBe(b.headers['Idempotency-Key'])
  })

  it('explains rate limits in plain words', async () => {
    fakeApi.override('post', DEPOSITS, () => ({
      status: 429,
      data: { error: { code: 'throttled', message: 'Request was throttled.', retry_after_seconds: 1700 } },
    }))
    const { user } = renderRoute('/deposit')
    await fillDeposit(user)
    await user.click(screen.getByRole('button', { name: 'Submit deposit request' }))
    expect(await screen.findByText('Too many attempts. Please wait 29 minutes and try again.')).toBeInTheDocument()
  })

  it('shows an error when payment instructions cannot load', async () => {
    fakeApi.override('get', /^\/payment-instructions\/$/, () => ({ status: 503, data: {} }))
    renderRoute('/deposit')
    expect(await screen.findByText('Payment instructions could not be loaded.')).toBeInTheDocument()
  })
})

describe('Withdrawal and inquiry payloads', () => {
  it('sends only the destination for the chosen payout method', async () => {
    fakeApi.signIn()
    const { user } = renderRoute('/withdraw')
    await user.type(await screen.findByLabelText('Amount'), '2500')
    await user.click(screen.getByRole('radio', { name: 'Bank account' }))
    await user.type(screen.getByLabelText('Bank name'), 'Sample Bank')
    await user.type(screen.getByLabelText('Account name'), 'Otieno Sample')
    await user.type(screen.getByLabelText('Account number'), '0123456789')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Submit withdrawal request' }))

    expect(await screen.findByText('WDR-TEST0001')).toBeInTheDocument()
    const request = fakeApi.requests.find((r) => r.method === 'post')
    expect(request.body).toMatchObject({ method: 'bank', mpesa_number: '', bank_name: 'Sample Bank', account_number: '0123456789' })
  })

  it('sends the numeric listing id with an inquiry and shows API errors in the dialog', async () => {
    fakeApi.override(
      'post',
      /^\/inquiries\/$/,
      () => ({ status: 400, data: { error: { code: 'validation_error', message: 'x', fields: { listing: ['This listing is no longer taking inquiries.'] } } } }),
      { once: true },
    )
    const { user } = renderRoute('/marketplace/1')
    await user.click(await screen.findByRole('button', { name: 'Purchase Inquiry' }))
    const dialog = screen.getByRole('dialog', { name: 'Purchase inquiry' })
    await user.type(within(dialog).getByLabelText('Full name'), 'Wanjiku Test')
    await user.type(within(dialog).getByLabelText('Phone number'), '0712345678')
    await user.click(within(dialog).getByRole('button', { name: 'Send inquiry' }))
    expect(await within(dialog).findByText('This listing is no longer taking inquiries.')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Send inquiry' }))
    expect(await screen.findByRole('dialog', { name: 'Inquiry submitted' })).toBeInTheDocument()
    const posts = fakeApi.requests.filter((r) => r.method === 'post')
    expect(posts[0].body.listing).toBe(1)
    expect(posts[1].headers['Idempotency-Key']).toBe(posts[0].headers['Idempotency-Key'])
  })
})

describe('Listing details errors', () => {
  it('offers a retry when the listing fails to load', async () => {
    fakeApi.override('get', /^\/livestock\/1\/$/, () => ({ status: 502, data: {} }), { once: true })
    const { user } = renderRoute('/marketplace/1')
    expect(await screen.findByRole('heading', { name: 'This listing could not be loaded' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'In-calf Friesian heifer' })).toBeInTheDocument()
  })
})
