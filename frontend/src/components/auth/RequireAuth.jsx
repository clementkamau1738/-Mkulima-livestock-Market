import { ShieldAlert } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { loginPath } from '../../utils/redirect'
import Button from '../ui/Button'
import { EmptyState } from '../ui/States'

export function AuthLoading() {
  return (
    <div role="status" className="container-page grid min-h-[40vh] place-items-center text-sm text-ink-muted">
      Loading…
    </div>
  )
}

// Guards a group of routes. The server enforces the same rules on every API
// call; this only decides what to render.
export default function RequireAuth({ reviewer = false }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <AuthLoading />
  if (!user) return <Navigate to={loginPath(location)} replace />
  if (reviewer && !user.isReviewer) {
    return (
      <div className="container-page pt-14">
        <EmptyState
          icon={ShieldAlert}
          title="Staff only"
          message="This area is for Mkulima staff. Your account does not have access."
          action={<Button to="/account">Go to my dashboard</Button>}
        />
      </div>
    )
  }
  return <Outlet />
}
