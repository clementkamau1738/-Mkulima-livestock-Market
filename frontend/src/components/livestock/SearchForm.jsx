import { Search } from 'lucide-react'
import { useSyncedDraft } from '../../hooks/useSyncedDraft'
import Button from '../ui/Button'

export default function SearchForm({ value = '', onSearch, size = 'md', placeholder = 'Search breed, location or keyword' }) {
  const [draft, setDraft] = useSyncedDraft(value)
  const large = size === 'lg'

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(draft.trim())
      }}
      className={`flex items-center gap-2 rounded-full border border-line bg-white p-1.5 shadow-card focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20 ${large ? 'sm:p-2' : ''}`}
    >
      <Search aria-hidden="true" className="ml-3 size-5 shrink-0 text-ink-muted" />
      <label htmlFor={`search-${size}`} className="sr-only">
        Search livestock
      </label>
      <input
        id={`search-${size}`}
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        maxLength={100}
        className={`min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-muted/80 focus:outline-none ${large ? 'py-2 text-base' : 'py-1.5 text-sm'}`}
      />
      <Button type="submit" size={large ? 'lg' : 'md'}>
        Search
      </Button>
    </form>
  )
}
