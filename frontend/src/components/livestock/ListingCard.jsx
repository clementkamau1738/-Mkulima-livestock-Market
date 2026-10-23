import { ArrowRight, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { formatAge, formatCategory, formatKes } from '../../utils/format'
import StatusBadge from '../ui/StatusBadge'

export default function ListingCard({ listing }) {
  const image = listing.images.find((i) => i.isPrimary) ?? listing.images[0]
  const age = formatAge(listing.ageMonths)

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line/80 bg-white shadow-card transition-shadow hover:shadow-lg focus-within:ring-2 focus-within:ring-forest">
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
        {image && (
          <img
            src={image.src}
            alt={image.alt}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        <StatusBadge status={listing.status} className="absolute top-3 left-3 shadow-sm" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
          {formatCategory(listing.category)} <span aria-hidden="true">&middot;</span> {listing.breed}
        </p>
        <h3 className="mt-1.5 font-display text-lg leading-snug font-semibold text-ink">
          <Link to={`/marketplace/${listing.id}`} className="after:absolute after:inset-0 focus:outline-none">
            {listing.title}
          </Link>
        </h3>
        <dl className="mt-3 space-y-1 text-sm text-ink-muted">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Location</dt>
            <MapPin aria-hidden="true" className="size-4 text-forest/70" />
            <dd>{listing.location}</dd>
          </div>
          {age && (
            <div className="flex gap-1.5">
              <dt>Age:</dt>
              <dd>{age}</dd>
            </div>
          )}
        </dl>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <p className="font-display text-xl font-semibold text-forest">
            <span className="sr-only">Price: </span>
            {formatKes(listing.priceKes)}
          </p>
          <span aria-hidden="true" className="inline-flex items-center gap-1 text-sm font-semibold text-forest group-hover:underline">
            View Details
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  )
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line/80 bg-white" data-testid="listing-skeleton">
      <div className="aspect-[4/3] animate-pulse bg-cream-200" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-cream-200" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-cream-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-cream-200" />
        <div className="h-6 w-1/3 animate-pulse rounded bg-cream-200 pt-4" />
      </div>
    </div>
  )
}
