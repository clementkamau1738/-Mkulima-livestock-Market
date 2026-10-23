import StatusBadge from '../ui/StatusBadge'

export default function StatusGuide({ title = 'What the statuses mean', items }) {
  return (
    <section aria-labelledby="status-guide" className="rounded-3xl border border-line/80 bg-white p-6">
      <h2 id="status-guide" className="font-display text-lg font-semibold text-ink">
        {title}
      </h2>
      <dl className="mt-4 space-y-4">
        {items.map(({ status, text }) => (
          <div key={status} className="space-y-1.5">
            <dt>
              <StatusBadge status={status} />
            </dt>
            <dd className="text-sm text-ink-muted">{text}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
