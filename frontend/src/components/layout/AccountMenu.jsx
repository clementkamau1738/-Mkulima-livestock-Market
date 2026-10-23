import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'

const itemClass = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-forest'

function firstName(user) {
  return user.fullName?.split(' ')[0] || user.email
}

// Disclosure menu: a button that shows a short list of links. Escape and
// clicks outside close it.
export default function AccountMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onPointerDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${firstName(user)}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-forest/15 bg-white py-1.5 pr-3 pl-1.5 text-sm font-semibold text-forest hover:border-forest/40 focus-visible:outline-2 focus-visible:outline-forest"
      >
        <span className="grid size-7 place-items-center rounded-full bg-lime text-forest">
          <UserRound aria-hidden="true" className="size-4" />
        </span>
        <span className="max-w-32 truncate">{firstName(user)}</span>
        <ChevronDown aria-hidden="true" className="size-4" />
      </button>
      {open && (
        <div id={menuId} className="absolute right-0 mt-2 w-64 rounded-2xl border border-line/80 bg-white p-2 shadow-card">
          <p className="truncate px-3 pt-1 pb-2 text-xs text-ink-muted">Signed in as {user.email}</p>
          <ul>
            <li>
              <Link to="/account" className={itemClass} onClick={close}>
                <LayoutDashboard aria-hidden="true" className="size-4 text-forest" />
                My dashboard
              </Link>
            </li>
            {user.isReviewer && (
              <li>
                <Link to="/admin" className={itemClass} onClick={close}>
                  <ShieldCheck aria-hidden="true" className="size-4 text-forest" />
                  Staff admin
                </Link>
              </li>
            )}
            <li>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  close()
                  onSignOut()
                }}
              >
                <LogOut aria-hidden="true" className="size-4 text-forest" />
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
