import { CircleCheck } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'

export default function RequestConfirmation({ title, receipt, children, actions }) {
  return (
    <div role="status" className="rounded-3xl border border-line/80 bg-white p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-lime text-forest">
          <CircleCheck aria-hidden="true" className="size-6" />
        </span>
        <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
      </div>

      <dl className="mt-6 grid gap-4 rounded-2xl bg-cream p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
            {receipt.isSample ? 'Sample reference' : 'Reference number'}
          </dt>
          <dd className="mt-1 font-mono text-lg font-semibold break-all text-forest">{receipt.reference}</dd>
          {receipt.isSample && (
            <p className="mt-1 text-xs text-ink-muted">Preview only. This request was not sent or saved.</p>
          )}
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">Status</dt>
          <dd className="mt-1.5">
            <StatusBadge status={receipt.status} />
          </dd>
        </div>
      </dl>

      <div className="mt-6 space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
      {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}
