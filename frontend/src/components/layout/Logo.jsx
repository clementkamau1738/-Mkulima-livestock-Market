import { Link } from 'react-router'

export function LogoMark({ className = 'size-9' }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="16" fill="currentColor" />
      <path d="M14 40c0-10 8-18 18-18s18 8 18 18" fill="none" stroke="#D9F36A" strokeWidth="5" strokeLinecap="round" />
      <path d="M20 22c-4-2-6-6-6-10m30 10c4-2 6-6 6-10" fill="none" stroke="#D9F36A" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="44" r="4" fill="#F7F3E9" />
    </svg>
  )
}

export default function Logo({ inverted = false, onClick }) {
  return (
    <Link to="/" onClick={onClick} className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime">
      <LogoMark className={`size-9 ${inverted ? 'text-lime/15' : 'text-forest'}`} />
      <span className="leading-none">
        <span className={`block font-display text-xl font-semibold tracking-tight ${inverted ? 'text-cream' : 'text-forest'}`}>Mkulima</span>
        <span className={`block text-[0.65rem] font-semibold tracking-[0.18em] uppercase ${inverted ? 'text-lime' : 'text-ink-muted'}`}>
          Livestock Market
        </span>
      </span>
    </Link>
  )
}
