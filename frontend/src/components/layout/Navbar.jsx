import { LogIn, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '../../hooks/useAuth'
import Button from '../ui/Button'
import AccountMenu from './AccountMenu'
import Logo from './Logo'
import { NAV_LINKS } from './navigation'

const linkClass = ({ isActive }) =>
  `rounded-full px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-forest ${
    isActive ? 'bg-forest/8 text-forest' : 'text-ink-muted hover:text-forest'
  }`

const mobileLinkClass = ({ isActive }) =>
  `block rounded-2xl px-4 py-3 text-base font-semibold ${isActive ? 'bg-forest text-cream' : 'text-ink hover:bg-cream'}`

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { status, user, signOut } = useAuth()
  const navigate = useNavigate()
  const close = () => setOpen(false)

  // Leave any protected page first, so its guard does not redirect to the
  // sign-in page once the user is cleared.
  async function handleSignOut() {
    close()
    navigate('/')
    try {
      await signOut()
      toast.success('You have signed out.')
    } catch {
      toast.error('We could not reach the server, so you were signed out on this device only.')
    }
  }

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-cream">
        Skip to content
      </a>
      <nav aria-label="Main" className="container-page flex h-18 items-center justify-between gap-4">
        <Logo onClick={close} />

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          {status === 'ready' && user && <AccountMenu user={user} onSignOut={handleSignOut} />}
          {status === 'ready' && !user && (
            <NavLink to="/login" className={linkClass}>
              <span className="inline-flex items-center gap-1.5">
                <LogIn aria-hidden="true" className="size-4" />
                Login
              </span>
            </NavLink>
          )}
          <Button to="/marketplace" variant="primary">
            Browse Livestock
          </Button>
        </div>

        <button
          type="button"
          className="grid size-11 place-items-center rounded-full text-forest hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-forest lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          {open ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-line/70 bg-white lg:hidden">
          <ul className="container-page space-y-1 py-4">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} className={mobileLinkClass} onClick={close}>
                  {link.label}
                </NavLink>
              </li>
            ))}
            {user ? (
              <>
                <li>
                  <NavLink to="/account" className={mobileLinkClass} onClick={close}>
                    My dashboard
                  </NavLink>
                </li>
                {user.isReviewer && (
                  <li>
                    <NavLink to="/admin" className={mobileLinkClass} onClick={close}>
                      Staff admin
                    </NavLink>
                  </li>
                )}
                <li>
                  <button type="button" className={`${mobileLinkClass({ isActive: false })} w-full text-left`} onClick={handleSignOut}>
                    Sign out
                  </button>
                </li>
              </>
            ) : (
              <li>
                <NavLink to="/login" className={mobileLinkClass} onClick={close}>
                  Login
                </NavLink>
              </li>
            )}
          </ul>
          <div className="container-page pb-5">
            <Button to="/marketplace" size="lg" className="w-full" onClick={close}>
              Browse Livestock
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
