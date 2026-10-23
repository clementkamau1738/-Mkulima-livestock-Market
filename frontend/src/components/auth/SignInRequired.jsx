import { LockKeyhole } from 'lucide-react'
import { useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { loginPath } from '../../utils/redirect'
import Button from '../ui/Button'
import Skeleton from '../ui/Skeleton'

// Renders `children(user)` for signed-in visitors, otherwise a prompt to sign
// in that returns here afterwards. The API refuses anonymous submissions too.
export default function SignInRequired({ title, message, children }) {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Skeleton className="h-96 rounded-3xl" />
  if (user) return children(user)
  const next = encodeURIComponent(`${location.pathname}${location.search}`)
  return (
    <section aria-labelledby="sign-in-required" className="rounded-3xl border border-line/80 bg-white p-6 sm:p-8">
      <span className="grid size-11 place-items-center rounded-full bg-lime text-forest">
        <LockKeyhole aria-hidden="true" className="size-5" />
      </span>
      <h2 id="sign-in-required" className="mt-4 font-display text-2xl font-semibold text-ink">
        {title}
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">{message}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button to={loginPath(location)}>Sign in</Button>
        <Button to={`/register?next=${next}`} variant="outline">
          Create an account
        </Button>
      </div>
    </section>
  )
}
