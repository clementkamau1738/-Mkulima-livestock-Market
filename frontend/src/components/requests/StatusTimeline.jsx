import { formatDateTime, formatStatus } from '../../utils/format'

// Status history, oldest first. `showActor` is for staff screens only.
export default function StatusTimeline({ history, showActor = false }) {
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {history.map((entry, i) => (
        <li key={`${entry.to}-${entry.at}-${i}`} className="relative">
          <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border-2 border-white bg-forest" />
          <p className="text-sm font-semibold text-ink">{entry.from ? formatStatus(entry.to) : 'Submitted'}</p>
          <p className="text-xs text-ink-muted">
            <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
            {showActor && entry.by && ` · ${entry.by.fullName}`}
          </p>
          {entry.reason && entry.reason !== 'Submitted' && <p className="mt-1 text-sm text-ink-muted">{entry.reason}</p>}
        </li>
      ))}
    </ol>
  )
}
