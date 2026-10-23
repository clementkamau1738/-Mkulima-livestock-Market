export default function AdminHeader({ title, description, action }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-ink-muted">{description}</p>}
      </div>
      {action}
    </header>
  )
}
