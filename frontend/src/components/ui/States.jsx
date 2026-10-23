import { CircleAlert, Inbox, RefreshCw } from 'lucide-react'
import Button from './Button'

export function EmptyState({ title, message, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-cream-200 text-forest">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold text-ink">{title}</h2>
      {message && <p className="mt-2 max-w-md text-sm text-ink-muted">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-3xl border border-danger/20 bg-danger-soft/50 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <CircleAlert aria-hidden="true" className="size-6" />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        {message ?? 'We could not load this content. Check your connection and try again.'}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Try again
        </Button>
      )}
    </div>
  )
}
