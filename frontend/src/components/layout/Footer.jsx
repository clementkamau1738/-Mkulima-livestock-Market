import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router'
import { site } from '../../config/site'
import { useAuth } from '../../hooks/useAuth'
import Logo from './Logo'
import { NAV_LINKS } from './navigation'

const YEAR = new Date().getFullYear()

export default function Footer() {
  const { user } = useAuth()
  return (
    <footer className="mt-24 bg-forest-950 text-cream/80">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            A marketplace for dairy cattle, beef cattle, bulls and calves from farms across Kenya. Every request is reviewed by a person before anything changes hands.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">Account</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {user ? (
              <li><Link to="/account" className="hover:text-white">My dashboard</Link></li>
            ) : (
              <>
                <li><Link to="/login" className="hover:text-white">Login</Link></li>
                <li><Link to="/register" className="hover:text-white">Create an account</Link></li>
              </>
            )}
            <li><Link to="/terms" className="hover:text-white">Terms of use</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy policy</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5"><Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lime" />{site.contact.phone}</li>
            <li className="flex gap-2.5"><Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lime" />{site.contact.email}</li>
            <li className="flex gap-2.5"><MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lime" />{site.contact.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-cream/60 sm:flex-row sm:justify-between">
          <p>&copy; {YEAR} {site.name}. Preview build with fictional sample listings.</p>
          <p>Illustrations are original sample artwork, not photographs of listed animals.</p>
        </div>
      </div>
    </footer>
  )
}
