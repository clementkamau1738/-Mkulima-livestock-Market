import ListingCard, { ListingCardSkeleton } from './ListingCard'

const GRID = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'

export default function ListingGrid({ listings, columns = GRID }) {
  return (
    <ul className={columns}>
      {listings.map((listing) => (
        <li key={listing.id} className="flex">
          <div className="h-full w-full">
            <ListingCard listing={listing} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ListingGridSkeleton({ count = 6, columns = GRID }) {
  return (
    <div className={columns} role="status" aria-label="Loading listings">
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  )
}
