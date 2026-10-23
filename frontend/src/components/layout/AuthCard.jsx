import { LogoMark } from './Logo'

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="container-page flex justify-center pt-12 sm:pt-16">
      <div className="w-full max-w-md rounded-[2rem] border border-line/80 bg-white p-6 shadow-card sm:p-10">
        <LogoMark className="size-11 text-forest" />
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-ink-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}
