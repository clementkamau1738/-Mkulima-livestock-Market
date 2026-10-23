import { ChevronRight, Lock, MessageSquare, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import Gallery from '../components/livestock/Gallery'
import InquiryForm from '../components/livestock/InquiryForm'
import ListingGrid from '../components/livestock/ListingGrid'
import RequestConfirmation from '../components/requests/RequestConfirmation'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import SampleNotice from '../components/ui/SampleNotice'
import Skeleton from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import { EmptyState, ErrorState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { SHOW_SAMPLE_DATA_NOTICE } from '../config/site'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { getLivestock, getRelatedLivestock } from '../services/livestockService'
import { formatAge, formatCategory, formatDate, formatKes, formatSex } from '../utils/format'

// Only facts present on the listing are rendered; nothing is inferred.
function facts(listing) {
  return [
    ['Breed', listing.breed],
    ['Category', formatCategory(listing.category)],
    ['Sex', formatSex(listing.sex)],
    ['Age', formatAge(listing.ageMonths)],
    ['Weight', listing.weightKg ? `${listing.weightKg} kg (seller estimate)` : null],
    ['Location', listing.location],
    ['Listed', listing.publishedAt ? formatDate(listing.publishedAt) : null],
  ].filter(([, value]) => value)
}

function DetailsSkeleton() {
  return (
    <div className="container-page grid gap-10 pt-10 lg:grid-cols-[1.2fr_1fr]" role="status" aria-label="Loading listing">
      <Skeleton className="aspect-[4/3] rounded-3xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    </div>
  )
}

function Related({ listing }) {
  const related = useAsync(() => getRelatedLivestock(listing), listing.id)
  if (related.status !== 'success' || related.data.length === 0) return null
  return (
    <section aria-labelledby="related" className="mt-20">
      <h2 id="related" className="font-display text-2xl font-semibold text-ink sm:text-3xl">
        Similar {formatCategory(listing.category).toLowerCase()} listings
      </h2>
      <div className="mt-6">
        <ListingGrid listings={related.data} />
      </div>
    </section>
  )
}

function InquiryDialog({ listing, open, onClose }) {
  const [receipt, setReceipt] = useState(null)
  const close = () => {
    onClose()
    setReceipt(null)
  }
  return (
    <Modal
      open={open}
      onClose={close}
      title={receipt ? 'Inquiry submitted' : 'Purchase inquiry'}
      description={receipt ? undefined : listing.title}
    >
      {receipt ? (
        <RequestConfirmation title="We have your inquiry" receipt={receipt} actions={<Button onClick={close}>Done</Button>}>
          <p>Your inquiry is pending. Our team will contact you to arrange verification or a viewing.</p>
          <p>This does not reserve or purchase the animal, and no payment has been requested or taken.</p>
        </RequestConfirmation>
      ) : (
        <InquiryForm listing={listing} onSubmitted={setReceipt} />
      )}
    </Modal>
  )
}

export default function LivestockDetails() {
  const { id } = useParams()
  const result = useAsync(() => getLivestock(id), id)
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const listing = result.data
  useDocumentTitle(listing?.title ?? 'Listing')

  if (result.status === 'loading') return <DetailsSkeleton />
  if (result.status === 'error') {
    return (
      <div className="container-page pt-14">
        {result.error?.status === 404 ? (
          <EmptyState
            icon={SearchX}
            title="Listing not found"
            message="This listing does not exist or is no longer published."
            action={<Button to="/marketplace">Back to marketplace</Button>}
          />
        ) : (
          <ErrorState title="This listing could not be loaded" onRetry={result.retry} />
        )}
      </div>
    )
  }

  return (
    <div className="container-page pt-8 sm:pt-10">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
          <li>
            <Link to="/marketplace" className="font-semibold text-forest hover:underline">
              Marketplace
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li aria-current="page" className="truncate">
            {listing.title}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <Gallery key={listing.id} images={listing.images} />

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={listing.status} />
            <span className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
              {formatCategory(listing.category)} &middot; {listing.breed}
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{listing.title}</h1>
          <p className="mt-3 font-display text-3xl font-semibold text-forest">
            <span className="sr-only">Price: </span>
            {formatKes(listing.priceKes)}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line/80 bg-line/80">
            {facts(listing).map(([label, value]) => (
              <div key={label} className="bg-white p-4 odd:last:col-span-2">
                <dt className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">{label}</dt>
                <dd className="mt-1 font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 space-y-3">
            {listing.status === 'sold' ? (
              <p className="rounded-2xl bg-cream-200 px-4 py-3 text-sm font-semibold text-ink-muted">This animal has been sold and is no longer taking inquiries.</p>
            ) : (
              <>
                {listing.status === 'reserved' && (
                  <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">
                    This animal is currently reserved. You can still inquire to be contacted if it becomes available.
                  </p>
                )}
                <Button size="lg" className="w-full" onClick={() => setInquiryOpen(true)}>
                  <MessageSquare aria-hidden="true" className="size-5" />
                  Purchase Inquiry
                </Button>
              </>
            )}
          </div>

          <div className="mt-6 flex gap-3 rounded-3xl border border-line/80 bg-white p-5">
            <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-forest" />
            <div>
              <h2 className="font-semibold text-ink">Seller contact</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Seller and farm contact details are shared only with buyers whose inquiry has been reviewed by our team. They are never shown publicly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="description" className="mt-14 max-w-3xl">
        <h2 id="description" className="font-display text-2xl font-semibold text-ink">
          About this listing
        </h2>
        <p className="mt-4 leading-relaxed whitespace-pre-line text-ink-muted">{listing.description}</p>
        {SHOW_SAMPLE_DATA_NOTICE && (
          <SampleNotice className="mt-6">This is a fictional sample listing. The animal, seller and images are not real.</SampleNotice>
        )}
      </section>

      <Related listing={listing} />

      {listing.status !== 'sold' && <InquiryDialog key={listing.id} listing={listing} open={inquiryOpen} onClose={() => setInquiryOpen(false)} />}
    </div>
  )
}
