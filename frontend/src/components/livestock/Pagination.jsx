import { ChevronLeft, ChevronRight } from 'lucide-react'

function pageWindow(page, total) {
  const pages = new Set([1, total, page - 1, page, page + 1])
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = pageWindow(page, totalPages)
  const base =
    'grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-forest'

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        className={`${base} text-forest hover:bg-forest/5 disabled:opacity-40`}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-ink-muted">&hellip;</span>}
          <button
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Page ${p}`}
            className={`${base} ${p === page ? 'bg-forest text-cream' : 'text-ink hover:bg-forest/5'}`}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        type="button"
        className={`${base} text-forest hover:bg-forest/5 disabled:opacity-40`}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </button>
    </nav>
  )
}
