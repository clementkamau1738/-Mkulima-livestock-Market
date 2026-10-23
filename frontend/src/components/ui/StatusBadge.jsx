const STYLES = {
  available: 'bg-success-soft text-success',
  approved: 'bg-success-soft text-success',
  completed: 'bg-success-soft text-success',
  reserved: 'bg-warning-soft text-warning',
  pending: 'bg-warning-soft text-warning',
  processing: 'bg-info-soft text-info',
  contacted: 'bg-info-soft text-info',
  viewing_arranged: 'bg-info-soft text-info',
  sold: 'bg-cream-200 text-ink-muted',
  cancelled: 'bg-cream-200 text-ink-muted',
  rejected: 'bg-danger-soft text-danger',
  failed: 'bg-danger-soft text-danger',
  draft: 'bg-cream-200 text-ink',
  archived: 'bg-cream-200 text-ink-muted',
  active: 'bg-success-soft text-success',
  suspended: 'bg-danger-soft text-danger',
}

const STATUS_LABELS = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  contacted: 'Contacted',
  viewing_arranged: 'Viewing arranged',
  cancelled: 'Cancelled',
  draft: 'Draft',
  archived: 'Archived',
  active: 'Active',
  suspended: 'Suspended',
}

export default function StatusBadge({ status, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status] ?? 'bg-cream-200 text-ink'} ${className}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
