import { SearchX, SlidersHorizontal, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import FilterPanel from '../components/livestock/FilterPanel'
import ListingGrid, { ListingGridSkeleton } from '../components/livestock/ListingGrid'
import Pagination from '../components/livestock/Pagination'
import SearchForm from '../components/livestock/SearchForm'
import Button from '../components/ui/Button'
import { SelectField } from '../components/ui/Field'
import SampleNotice from '../components/ui/SampleNotice'
import { EmptyState, ErrorState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { SHOW_SAMPLE_DATA_NOTICE } from '../config/site'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { getBreeds, getCategories, listLivestock } from '../services/livestockService'
import { formatCategory, formatKes } from '../utils/format'
import { SORT_OPTIONS, filtersToParams, hasActiveFilters, parseFilters } from '../utils/listingQuery'

function activeChips(filters) {
  const chips = []
  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”` })
  if (filters.category) chips.push({ key: 'category', label: formatCategory(filters.category) })
  if (filters.breed) chips.push({ key: 'breed', label: filters.breed })
  if (filters.minPrice) chips.push({ key: 'minPrice', label: `From ${formatKes(Number(filters.minPrice))}` })
  if (filters.maxPrice) chips.push({ key: 'maxPrice', label: `Up to ${formatKes(Number(filters.maxPrice))}` })
  return chips
}

export default function Marketplace() {
  useDocumentTitle('Marketplace')
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseFilters(searchParams)
  const queryKey = filtersToParams(filters).toString()
  const [showFilters, setShowFilters] = useState(false)
  const resultsRef = useRef(null)

  const listings = useAsync(() => listLivestock(filters), queryKey)
  const categories = useAsync(getCategories, 'categories')
  const breeds = useAsync(getBreeds, 'breeds')

  function update(patch) {
    setSearchParams(filtersToParams({ ...filters, page: 1, ...patch }))
  }

  function goToPage(page) {
    update({ page })
    resultsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  const reset = () => setSearchParams(new URLSearchParams(filters.sort !== 'newest' ? { sort: filters.sort } : {}))
  const chips = activeChips(filters)
  const filtering = hasActiveFilters(filters)
  const data = listings.data

  const filterPanel = (
    <FilterPanel
      filters={filters}
      categories={categories.data ?? []}
      breeds={breeds.data ?? []}
      onChange={update}
      onReset={reset}
      canReset={filtering}
    />
  )

  return (
    <div className="container-page pt-10 sm:pt-14">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-forest/70 uppercase">Marketplace</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Browse livestock</h1>
        <p className="mt-3 text-lg text-ink-muted">Dairy cows, beef cattle, bulls and calves listed by farms across Kenya.</p>
      </header>
      {SHOW_SAMPLE_DATA_NOTICE && (
      <SampleNotice className="mt-6 max-w-3xl">
        Preview: the listings currently on the marketplace are fictional sample data. Photos show similar animals, not the ones listed.
      </SampleNotice>
      )}

      <div className="mt-8">
        <SearchForm value={filters.q} onSearch={(q) => update({ q })} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl border border-line/80 bg-white p-6">
            <h2 className="mb-5 font-display text-lg font-semibold">Filters</h2>
            {filterPanel}
          </div>
        </aside>

        <section aria-labelledby="results-heading" ref={resultsRef} className="scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="results-heading" className="sr-only">
                Results
              </h2>
              <p aria-live="polite" className="text-sm text-ink-muted">
                {listings.status === 'success' && (
                  <>
                    <strong className="font-semibold text-ink">{data.count}</strong> {data.count === 1 ? 'listing' : 'listings'}
                    {data.totalPages > 1 && ` · page ${data.page} of ${data.totalPages}`}
                  </>
                )}
                {listings.status === 'loading' && 'Loading listings…'}
              </p>
            </div>
            <div className="flex items-end gap-3">
              <Button
                variant="outline"
                className="lg:hidden"
                aria-expanded={showFilters}
                aria-controls="mobile-filters"
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                Filters{chips.length > 0 && ` (${chips.length})`}
              </Button>
              <div className="w-48">
                <SelectField label="Sort by" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
          </div>

          {showFilters && (
            <div id="mobile-filters" className="mt-5 rounded-3xl border border-line/80 bg-white p-5 lg:hidden">
              {filterPanel}
            </div>
          )}

          {chips.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Active filters">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    onClick={() => update({ [chip.key]: '' })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-forest/8 px-3 py-1.5 text-sm font-semibold text-forest hover:bg-forest/15 focus-visible:outline-2 focus-visible:outline-forest"
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    {chip.label}
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            {listings.status === 'loading' && <ListingGridSkeleton count={6} />}
            {listings.status === 'error' && (
              <ErrorState
                title="Listings could not be loaded"
                message={listings.error?.fields ? Object.values(listings.error.fields)[0][0] : listings.error?.message}
                onRetry={listings.retry}
              />
            )}
            {listings.status === 'success' && data.count === 0 && (
              <EmptyState
                icon={SearchX}
                title="No livestock matches your search"
                message={filtering ? 'Try a different keyword, widen the price range, or clear the filters.' : 'There are no listings right now. Please check back soon.'}
                action={filtering && <Button onClick={reset}>Clear all filters</Button>}
              />
            )}
            {listings.status === 'success' && data.count > 0 && (
              <>
                <ListingGrid listings={data.results} />
                <div className="mt-10">
                  <Pagination page={data.page} totalPages={data.totalPages} onChange={goToPage} />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
