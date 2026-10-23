import { Search } from 'lucide-react'
import { useState } from 'react'
import { SelectField } from '../ui/Field'

// Search box (applied on submit) plus any number of select filters.
export default function AdminFilters({ search, onSearch, searchLabel = 'Search', selects = [] }) {
  const [draft, setDraft] = useState(search)
  const [synced, setSynced] = useState(search)
  if (search !== synced) {
    setSynced(search)
    setDraft(search)
  }

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <form
        role="search"
        className="flex min-w-0 flex-1 basis-64 items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onSearch(draft.trim())
        }}
      >
        <label className="block min-w-0 flex-1 space-y-1.5">
          <span className="block text-sm font-semibold text-ink">{searchLabel}</span>
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="block w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-cream hover:bg-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          <Search aria-hidden="true" className="size-4" />
          <span className="sr-only">Search</span>
        </button>
      </form>
      {selects.map((s) => (
        <div key={s.label} className="w-full sm:w-48">
          <SelectField label={s.label} value={s.value} onChange={(e) => s.onChange(e.target.value)}>
            <option value="">All</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </div>
      ))}
    </div>
  )
}
