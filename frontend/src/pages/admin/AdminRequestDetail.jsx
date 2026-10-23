import { ChevronLeft, SearchX } from 'lucide-react'
import { Link, useParams } from 'react-router'
import AdminHeader from '../../components/admin/AdminHeader'
import TransitionPanel from '../../components/admin/TransitionPanel'
import StatusTimeline from '../../components/requests/StatusTimeline'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getRequest, transitionRequest } from '../../services/adminService'
import { formatDateTime, formatKes } from '../../utils/format'
import { REQUEST_KINDS } from './requestKinds'

function facts(item) {
  const payout = item.payout
  return [
    ['Customer name', item.fullName],
    ['Phone', item.phone],
    ['Email', item.email],
    ['Account', item.customer ? `${item.customer.fullName} (${item.customer.email})` : 'Guest (not signed in)'],
    ['Listing', item.listing?.title],
    ['Amount', item.amountKes != null ? formatKes(item.amountKes) : null],
    ['Payment reference (customer supplied, unverified until approved)', item.paymentReference],
    ['Payout method', item.method === 'mpesa' ? 'M-Pesa' : item.method === 'bank' ? 'Bank transfer' : null],
    ['M-Pesa number', payout?.mpesaNumber],
    ['Bank', payout?.bankName],
    ['Account name', payout?.accountName],
    ['Account number', payout?.accountNumber],
    ['Message', item.message],
    ['Customer notes', item.notes],
    ['Customer reason', item.reason],
    ['Submitted', formatDateTime(item.createdAt)],
    ['First reviewed by', item.reviewer ? `${item.reviewer.fullName} on ${formatDateTime(item.reviewedAt)}` : null],
    ['Recorded transaction', item.transaction ? `${item.transaction.reference} (provider ref ${item.transaction.externalReference})` : null],
  ].filter(([, v]) => v)
}

export default function AdminRequestDetail({ kind }) {
  const { reference } = useParams()
  const config = REQUEST_KINDS[kind]
  useDocumentTitle(reference)
  const result = useAsync(() => getRequest(kind, reference), `${kind}:${reference}`)
  const back = (
    <Link to={`/admin/${kind}`} className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
      <ChevronLeft aria-hidden="true" className="size-4" />
      All {config.title.toLowerCase()}
    </Link>
  )

  if (result.status === 'loading') return <Skeleton className="h-96 rounded-3xl" />
  if (result.status === 'error') {
    return result.error?.status === 404 ? (
      <EmptyState icon={SearchX} title="Not found" message={`No record with reference ${reference}.`} action={<Button to={`/admin/${kind}`}>Back to the list</Button>} />
    ) : (
      <ErrorState title="This record could not be loaded" message={result.error?.message} onRetry={result.retry} />
    )
  }

  const item = result.data
  return (
    <>
      {back}
      <div className="mt-3">
        <AdminHeader title={item.reference} action={<StatusBadge status={item.status} className="text-sm" />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <section aria-labelledby="details" className="rounded-3xl border border-line/80 bg-white p-6">
          <h2 id="details" className="font-display text-lg font-semibold text-ink">
            Details
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {facts(item).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">{label}</dt>
                <dd className="mt-0.5 font-semibold break-words whitespace-pre-line text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="space-y-6">
          <TransitionPanel
            kind={kind}
            status={item.status}
            allowed={item.allowedTransitions}
            onSubmit={(values) => transitionRequest(kind, item.reference, values)}
            onChanged={result.retry}
          />
          <section aria-labelledby="history" className="rounded-3xl border border-line/80 bg-white p-6">
            <h2 id="history" className="mb-4 font-display text-lg font-semibold text-ink">
              Status history
            </h2>
            <StatusTimeline history={item.history} showActor />
          </section>
        </div>
      </div>
    </>
  )
}
