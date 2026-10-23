import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TEST_PASSWORD, TEST_STAFF, fakeApi } from './fakeApi'
import { renderRoute } from './renderRoute'

async function signInWith(user, email, password = TEST_PASSWORD) {
  await user.type(await screen.findByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('Protected routes', () => {
  it('sends visitors to sign in and back to where they were going', async () => {
    const { user, router } = renderRoute('/account?tab=deposits')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toBe('?next=%2Faccount%3Ftab%3Ddeposits')
    expect(await screen.findByText('Please sign in to continue.')).toBeInTheDocument()

    await signInWith(user, 'otieno@example.test')
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'))
    expect(router.state.location.search).toBe('?tab=deposits')
    expect(await screen.findByRole('heading', { level: 1, name: 'Hello, Otieno' })).toBeInTheDocument()
  })

  it('shows customers a staff-only notice for the admin area', async () => {
    fakeApi.signIn()
    renderRoute('/admin/deposits')
    expect(await screen.findByRole('heading', { name: 'Staff only' })).toBeInTheDocument()
    expect(fakeApi.requests.some((r) => r.path.startsWith('/admin/'))).toBe(false)
  })

  it('ignores a next link that points to another site', async () => {
    const { user, router } = renderRoute('/login?next=//evil.example/steal')
    await signInWith(user, 'otieno@example.test')
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'))
  })

  it('takes staff to the admin area by default', async () => {
    const { user, router } = renderRoute('/login')
    await signInWith(user, TEST_STAFF.email)
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })
})

describe('Sign in, sign up and sign out', () => {
  it('shows the server message for wrong credentials', async () => {
    const { user, router } = renderRoute('/login')
    await signInWith(user, 'otieno@example.test', 'wrong-password')
    expect(await screen.findByText('The email or password is incorrect.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('registers, signs in and maps server field errors', async () => {
    const { user, router } = renderRoute('/register')
    await user.type(await screen.findByLabelText('Full name'), 'Achieng Test')
    await user.type(screen.getByLabelText('Email'), 'otieno@example.test')
    await user.type(screen.getByLabelText('Phone number'), '0712345678')
    await user.type(screen.getByLabelText('Password'), 'grazing-cattle-77')
    await user.type(screen.getByLabelText('Confirm password'), 'grazing-cattle-77')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('An account with this email already exists. Sign in instead.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')

    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'achieng@example.test')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'))
    const register = fakeApi.requests.filter((r) => r.path === '/auth/register/').at(-1)
    expect(register.body).toEqual({ full_name: 'Achieng Test', email: 'achieng@example.test', phone: '0712345678', password: 'grazing-cattle-77' })
  })

  it('signs out from the account menu', async () => {
    fakeApi.signIn()
    const { user, router } = renderRoute('/account')
    await user.click(await screen.findByRole('button', { name: /account menu/i }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(fakeApi.requests.some((r) => r.method === 'post' && r.path === '/auth/logout/')).toBe(true)
    expect(await screen.findByText('You have signed out.')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: /login/i })).toBeInTheDocument()
  })
})

describe('Expired sessions', () => {
  it('notices an expired session on the next API call and asks to sign in again', async () => {
    fakeApi.signIn()
    const { user, router } = renderRoute('/account')
    await screen.findByRole('heading', { level: 1, name: 'Hello, Otieno' })
    fakeApi.expireSession()
    await user.click(screen.getByRole('link', { name: 'Deposit requests' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toBe('?next=%2Faccount%3Ftab%3Ddeposits')
    expect(await screen.findByText('Your session has ended. Please sign in again.')).toBeInTheDocument()
  })

  it('refreshes a stale security token and retries once', async () => {
    fakeApi.signIn()
    fakeApi.override('post', /^\/deposits\/$/, () => ({ status: 403, data: { error: { code: 'csrf_failed', message: 'Your security token has expired.' } } }), {
      once: true,
    })
    const { user } = renderRoute('/deposit')
    await user.type(await screen.findByLabelText('Amount'), '5000')
    await user.type(screen.getByLabelText('Payment reference'), 'TJK4ABC123')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Submit deposit request' }))
    expect(await screen.findByText('DEP-TEST0001')).toBeInTheDocument()
    const posts = fakeApi.requests.filter((r) => r.method === 'post' && r.path === '/deposits/')
    expect(posts).toHaveLength(2)
    expect(posts[1].headers['Idempotency-Key']).toBe(posts[0].headers['Idempotency-Key'])
  })
})

describe('Customer dashboard', () => {
  it('lists the customer requests with status history and review notes', async () => {
    fakeApi.signIn()
    fakeApi.override('get', /^\/deposits\/$/, () => ({
      status: 200,
      data: {
        count: 1,
        page: 1,
        total_pages: 1,
        results: [
          {
            reference: 'DEP-AAAA2222',
            amount: '7500.00',
            payment_reference: 'TJK4ABC123',
            status: 'rejected',
            review_note: 'No matching payment was found in the statement.',
            created_at: '2026-10-20T10:00:00+03:00',
            history: [
              { from_status: '', to_status: 'pending', reason: 'Submitted', created_at: '2026-10-20T10:00:00+03:00' },
              { from_status: 'pending', to_status: 'rejected', reason: 'No matching payment was found in the statement.', created_at: '2026-10-21T09:00:00+03:00' },
            ],
          },
        ],
      },
    }))
    const { user } = renderRoute('/account?tab=deposits')
    expect(await screen.findByText('DEP-AAAA2222')).toBeInTheDocument()
    expect(screen.getByText('KES 7,500 · ref TJK4ABC123')).toBeInTheDocument()
    await user.click(screen.getByText('DEP-AAAA2222'))
    expect(screen.getAllByText('No matching payment was found in the statement.').length).toBeGreaterThan(0)
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Deposit requests' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows an empty state with a next step', async () => {
    fakeApi.signIn()
    renderRoute('/account?tab=withdrawals')
    expect(await screen.findByText('You have not requested any withdrawals.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request a withdrawal' })).toHaveAttribute('href', '/withdraw')
  })
})
