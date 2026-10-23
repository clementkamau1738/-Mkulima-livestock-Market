import { Link } from 'react-router'
import AdminHeader from '../../components/admin/AdminHeader'
import Skeleton from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getSummary } from '../../services/adminService'

function Stat({ label, value, to, highlight }) {
  return (
    <Link
      to={to}
      className={`block rounded-3xl border p-5 transition-colors focus-visible:outline-2 focus-visible:outline-forest ${
        highlight && value > 0 ? 'border-forest bg-forest text-cream hover:bg-forest-700' : 'border-line/80 bg-white text-ink hover:border-forest/40'
      }`}
    >
      <span className="block font-display text-4xl font-semibold">{value}</span>
      <span className={`mt-1 block text-sm font-semibold ${highlight && value > 0 ? 'text-cream/85' : 'text-ink-muted'}`}>{label}</span>
    </Link>
  )
}

export default function AdminOverview() {
  useDocumentTitle('Staff admin')
  const result = useAsync(getSummary, 'summary')

  return (
    <>
      <AdminHeader title="Overview" description="What needs attention now. Counts are live from the database." />
      {result.status === 'loading' && (
        <div role="status" aria-label="Loading summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
      )}
      {result.status === 'error' && <ErrorState title="The summary could not be loaded" message={result.error?.message} onRetry={result.retry} />}
      {result.status === 'success' && <SummaryGrid data={result.data} />}
    </>
  )
}

function SummaryGrid({ data }) {
  const n = (group, status) => data[group]?.[status] ?? 0
  return (
    <div className="space-y-10">
      <section aria-labelledby="queue">
        <h2 id="queue" className="mb-4 font-display text-xl font-semibold text-ink">
          Waiting for review
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Pending deposits" value={n('deposits', 'pending')} to="/admin/deposits?status=pending" highlight />
          <Stat label="Pending withdrawals" value={n('withdrawals', 'pending')} to="/admin/withdrawals?status=pending" highlight />
          <Stat
            label="Payouts to send or confirm"
            value={n('withdrawals', 'approved') + n('withdrawals', 'processing')}
            to="/admin/withdrawals?status=approved"
            highlight
          />
          <Stat label="New inquiries" value={n('inquiries', 'pending')} to="/admin/inquiries?status=pending" highlight />
        </div>
      </section>
      <section aria-labelledby="listings-summary">
        <h2 id="listings-summary" className="mb-4 font-display text-xl font-semibold text-ink">
          Listings
        </h2>
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {['draft', 'available', 'reserved', 'sold', 'archived'].map((s) => (
            <Stat key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} value={n('listings', s)} to={`/admin/listings?status=${s}`} />
          ))}
        </div>
      </section>
      <section aria-labelledby="people">
        <h2 id="people" className="mb-4 font-display text-xl font-semibold text-ink">
          Customers
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Customer accounts" value={data.customers.total} to="/admin/customers?role=customer" />
          <Stat label="Active" value={data.customers.active} to="/admin/customers?role=customer&active=true" />
        </div>
      </section>
    </div>
  )
}
