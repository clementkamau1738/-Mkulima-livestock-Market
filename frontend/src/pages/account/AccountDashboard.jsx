import { ArrowRight, ChevronDown, Inbox } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import Pagination from '../../components/livestock/Pagination'
import StatusTimeline from '../../components/requests/StatusTimeline'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import Skeleton from '../../components/ui/Skeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { listMyRequests } from '../../services/accountService'
import { formatDate, formatKes } from '../../utils/format'

const TABS = [
  { id: 'inquiries', label: 'Purchase inquiries', empty: 'You have not sent any purchase inquiries yet.', action: { to: '/marketplace', label: 'Browse livestock' } },
  { id: 'deposits', label: 'Deposit requests', empty: 'You have not submitted any deposit requests.', action: { to: '/deposit', label: 'Submit a deposit request' } },
  { id: 'withdrawals', label: 'Withdrawal requests', empty: 'You have not requested any withdrawals.', action: { to: '/withdraw', label: 'Request a withdrawal' } },
]

function AccountCard({ user }) {
  const rows = [
    ['Name', user.fullName],
    ['Email', user.email],
    ['Phone', user.phone],
    ['Member since', formatDate(user.joinedAt)],
  ].filter(([, v]) => v)
  return (
    <section aria-labelledby="account-info" className="rounded-3xl border border-line/80 bg-white p-6">
      <h2 id="account-info" className="font-display text-lg font-semibold text-ink">
        Account information
      </h2>
      <dl className="mt-4 space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">{label}</dt>
            <dd className="mt-0.5 font-semibold break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {user.isReviewer && (
        <Button to="/admin" variant="outline" size="sm" className="mt-5">
          Open staff admin
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      )}
    </section>
  )
}

function summaryLine(item) {
  if (item.kind === 'inquiries') return item.listing?.title
  if (item.kind === 'deposits') return `${formatKes(item.amountKes)} · ref ${item.paymentReference}`
  return `${formatKes(item.amountKes)} · ${item.destination}`
}

function RequestItem({ item }) {
  return (
    <li>
      <details className="group rounded-2xl border border-line/80 bg-white">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 p-4 focus-visible:outline-2 focus-visible:outline-forest sm:p-5 [&::-webkit-details-marker]:hidden">
          <span className="font-mono text-sm font-semibold text-forest">{item.reference}</span>
          <StatusBadge status={item.status} />
          <span className="min-w-0 flex-1 basis-full truncate text-sm text-ink-muted sm:basis-auto">{summaryLine(item)}</span>
          <span className="text-xs text-ink-muted">{formatDate(item.createdAt)}</span>
          <ChevronDown aria-hidden="true" className="size-4 text-ink-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-line/70 p-4 sm:p-5">
          {item.reviewNote && (
            <p className="mb-4 rounded-xl bg-cream px-3 py-2 text-sm text-ink">
              <span className="font-semibold">Note from our team: </span>
              {item.reviewNote}
            </p>
          )}
          {item.listing && (
            <p className="mb-4 text-sm">
              <Link to={`/marketplace/${item.listing.id}`} className="font-semibold text-forest hover:underline">
                View listing
              </Link>
            </p>
          )}
          <h3 className="mb-3 text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">Status history</h3>
          <StatusTimeline history={item.history} />
        </div>
      </details>
    </li>
  )
}

function RequestList({ tab, page, onPage }) {
  const result = useAsync(() => listMyRequests(tab.id, page), `${tab.id}:${page}`)
  if (result.status === 'loading') {
    return (
      <div role="status" aria-label="Loading requests" className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (result.status === 'error') return <ErrorState title="Your requests could not be loaded" message={result.error?.message} onRetry={result.retry} />
  const data = result.data
  if (data.count === 0) {
    return <EmptyState icon={Inbox} title="Nothing here yet" message={tab.empty} action={<Button to={tab.action.to}>{tab.action.label}</Button>} />
  }
  return (
    <>
      <ul className="space-y-3">
        {data.results.map((item) => (
          <RequestItem key={item.reference} item={item} />
        ))}
      </ul>
      <div className="mt-8">
        <Pagination page={data.page} totalPages={data.totalPages} onChange={onPage} />
      </div>
    </>
  )
}

export default function AccountDashboard() {
  useDocumentTitle('My dashboard')
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.id === params.get('tab')) ?? TABS[0]
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)

  return (
    <div className="container-page pt-10 sm:pt-14">
      <PageHeader eyebrow="My dashboard" title={`Hello, ${user.fullName.split(' ')[0] || 'there'}`}>
        Follow your inquiries and requests. Statuses change only after our team reviews them.
      </PageHeader>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <section aria-label="My requests" className="min-w-0">
          <nav aria-label="Request types" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {TABS.map((t) => (
              <Link
                key={t.id}
                to={`?tab=${t.id}`}
                aria-current={t.id === tab.id ? 'page' : undefined}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-forest ${
                  t.id === tab.id ? 'bg-forest text-cream' : 'bg-white text-ink-muted hover:text-forest'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <h2 className="sr-only">{tab.label}</h2>
          <div className="mt-6">
            <RequestList key={tab.id} tab={tab} page={page} onPage={(p) => setParams({ tab: tab.id, page: String(p) })} />
          </div>
        </section>
        <aside className="order-first lg:order-none">
          <AccountCard user={user} />
        </aside>
      </div>
    </div>
  )
}
