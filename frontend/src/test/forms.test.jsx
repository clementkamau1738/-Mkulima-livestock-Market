import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fakeApi } from './fakeApi'
import { renderRoute } from './renderRoute'

// Name and phone come prefilled from the signed-in account.
async function fillCommon(user) {
  await user.type(await screen.findByLabelText('Amount'), '5000')
}

describe('Deposit form', () => {
  beforeEach(() => {
    fakeApi.signIn()
  })

  it('blocks submission and explains each invalid field', async () => {
    const { user } = renderRoute('/deposit')
    expect(await screen.findByLabelText('Full name')).toHaveValue('Otieno Sample')
    expect(screen.getByLabelText('Phone number')).toHaveValue('+254712345678')
    await user.clear(screen.getByLabelText('Full name'))
    await user.click(screen.getByRole('button', { name: 'Submit deposit request' }))
    expect(screen.getByText('Enter your full name')).toBeInTheDocument()
    expect(screen.getByText('Enter an amount in KES')).toBeInTheDocument()
    expect(screen.getByText('Enter the payment reference from your confirmation')).toBeInTheDocument()
    expect(screen.getByText('Please confirm you understand how deposits are reviewed')).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true')

    await user.type(screen.getByLabelText('Amount'), '0')
    await user.type(screen.getByLabelText('Payment reference'), 'ab')
    await user.click(screen.getByRole('button', { name: 'Submit deposit request' }))
    expect(screen.getByText('Amount must be at least KES 1')).toBeInTheDocument()
    expect(screen.getByText('Use 6 to 30 letters, numbers or hyphens')).toBeInTheDocument()
  })

  it('shows placeholder payment instructions, never invented details', async () => {
    renderRoute('/deposit')
    const box = await screen.findByRole('region', { name: 'How to pay a deposit' })
    expect(within(box).getByText(/official payment details have not been published yet/)).toBeInTheDocument()
    expect(within(box).getAllByText('[To be provided by administrator]')).toHaveLength(3)
  })

  it('confirms a valid request as pending with a labelled sample reference', async () => {
    const { user } = renderRoute('/deposit')
    await screen.findByRole('region', { name: 'How to pay a deposit' })
    await fillCommon(user)
    await user.type(screen.getByLabelText('Payment reference'), 'TJK4ABC123')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Submit deposit request' }))

    expect(await screen.findByRole('heading', { name: 'Deposit request submitted' })).toBeInTheDocument()
    expect(screen.getByText('Reference number')).toBeInTheDocument()
    expect(screen.getByText('DEP-TEST0001')).toBeInTheDocument()
    expect(screen.queryByText(/not sent or saved/)).toBeNull()
    expect(screen.getAllByText('Pending review').length).toBeGreaterThan(0)
    expect(screen.getByText('We have not confirmed receiving any money.')).toBeInTheDocument()
    expect(screen.queryByText(/deposit (was )?received/i)).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Submit another request' }))
    expect(screen.getByLabelText('Amount')).toHaveValue('')
    expect(screen.getByLabelText('Full name')).toHaveValue('Otieno Sample')
  })

  it('asks visitors to sign in instead of showing the form', async () => {
    fakeApi.expireSession()
    renderRoute('/deposit')
    expect(await screen.findByRole('heading', { name: 'Sign in to submit a deposit request' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Payment reference')).toBeNull()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?next=%2Fdeposit')
    // Instructions stay public.
    expect(await screen.findByRole('region', { name: 'How to pay a deposit' })).toBeInTheDocument()
  })
})

describe('Withdrawal form', () => {
  beforeEach(() => {
    fakeApi.signIn()
  })

  it('shows no balance figure', async () => {
    renderRoute('/withdraw')
    await screen.findByRole('heading', { level: 1, name: /request a withdrawal/i })
    expect(screen.getByRole('heading', { name: /about balances/i })).toBeInTheDocument()
    expect(screen.queryByText(/available balance/i)).toBeNull()
    expect(screen.queryByText(/KES \d/)).toBeNull()
  })

  it('switches destination fields and validates them', async () => {
    const { user } = renderRoute('/withdraw')
    await fillCommon(user)
    expect(screen.getByLabelText('M-Pesa number')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Bank account' }))
    expect(screen.queryByLabelText('M-Pesa number')).toBeNull()
    await user.type(screen.getByLabelText('Account number'), '12ab')
    await user.click(screen.getByRole('button', { name: 'Submit withdrawal request' }))
    expect(screen.getByText('Enter your bank name')).toBeInTheDocument()
    expect(screen.getByText('Use 6 to 20 digits')).toBeInTheDocument()
    expect(screen.getByText('Please confirm you understand how withdrawals are reviewed')).toBeInTheDocument()
  })

  it('confirms a valid request as pending without implying payment', async () => {
    const { user } = renderRoute('/withdraw')
    await fillCommon(user)
    await user.type(screen.getByLabelText('M-Pesa number'), '0712345678')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Submit withdrawal request' }))

    expect(await screen.findByRole('heading', { name: 'Withdrawal request submitted' })).toBeInTheDocument()
    expect(screen.getByText(/^WDR-TEST\d{4}$/)).toBeInTheDocument()
    expect(screen.getByText('No money has been sent.')).toBeInTheDocument()
  })
})

describe('Account forms', () => {
  it('register enforces password rules and matching confirmation', async () => {
    const { user } = renderRoute('/register')
    await user.type(await screen.findByLabelText('Password'), '12345678')
    await user.type(screen.getByLabelText('Confirm password'), '1234567')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Password cannot be only numbers')).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(screen.getByText('You must accept the terms to continue')).toBeInTheDocument()
  })

  it('login validates before contacting the server', async () => {
    const { user } = renderRoute('/login')
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Enter your email address')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(fakeApi.requests.some((r) => r.path === '/auth/login/')).toBe(false)
  })
})
