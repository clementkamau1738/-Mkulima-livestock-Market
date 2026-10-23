import { ClipboardList, Gauge, HandCoins, MessageSquare, PawPrint, ScrollText, Users, Wallet } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

const LINKS = [
  { to: '/admin', label: 'Overview', icon: Gauge, end: true },
  { to: '/admin/listings', label: 'Listings', icon: PawPrint },
  { to: '/admin/inquiries', label: 'Inquiries', icon: MessageSquare },
  { to: '/admin/deposits', label: 'Deposits', icon: Wallet },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: HandCoins },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/audit-log', label: 'Audit log', icon: ScrollText },
]

const linkClass = ({ isActive }) =>
  `flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-forest lg:rounded-xl ${
    isActive ? 'bg-forest text-cream' : 'text-ink-muted hover:bg-white hover:text-forest'
  }`

export default function AdminLayout() {
  return (
    <div className="container-page pt-8 sm:pt-10">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-forest/70 uppercase">
        <ClipboardList aria-hidden="true" className="size-4" />
        Staff admin
      </p>
      <div className="mt-4 grid gap-8 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Admin sections" className="-mx-1 overflow-x-auto px-1 pb-1 lg:overflow-visible">
          <ul className="flex gap-1.5 lg:sticky lg:top-24 lg:flex-col">
            {LINKS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={linkClass}>
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
