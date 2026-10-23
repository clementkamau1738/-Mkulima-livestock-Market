export default function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="max-w-3xl">
      {eyebrow && <p className="text-xs font-semibold tracking-[0.18em] text-forest/70 uppercase">{eyebrow}</p>}
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{title}</h1>
      {children && <div className="mt-3 text-lg leading-relaxed text-ink-muted">{children}</div>}
    </header>
  )
}
