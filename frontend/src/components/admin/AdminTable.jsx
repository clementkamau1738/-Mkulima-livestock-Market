import Pagination from '../livestock/Pagination'
import Skeleton from '../ui/Skeleton'
import { EmptyState, ErrorState } from '../ui/States'

// Paged table for staff screens. Wide tables scroll inside their card so the
// page itself never scrolls sideways on phones.
export default function AdminTable({ caption, columns, result, rowKey, onPage, emptyMessage = 'Nothing matches these filters.' }) {
  if (result.status === 'loading') {
    return (
      <div role="status" aria-label={`Loading ${caption.toLowerCase()}`} className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    )
  }
  if (result.status === 'error') return <ErrorState title={`${caption} could not be loaded`} message={result.error?.message} onRetry={result.retry} />
  const { results, count, page, totalPages } = result.data
  if (count === 0) return <EmptyState title="No results" message={emptyMessage} />

  return (
    <>
      <p className="mb-3 text-sm text-ink-muted" aria-live="polite">
        <strong className="text-ink">{count}</strong> {count === 1 ? 'result' : 'results'}
        {totalPages > 1 && ` · page ${page} of ${totalPages}`}
      </p>
      {/* relative: keeps sr-only (absolute) cells inside the scroll area on phones */}
      <div className="relative overflow-x-auto rounded-2xl border border-line/80 bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-cream/60 text-xs tracking-[0.08em] text-ink-muted uppercase">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`px-4 py-3 font-semibold ${c.className ?? ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {results.map((row) => (
              <tr key={rowKey(row)} className="align-middle hover:bg-cream/40">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.className ?? ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6">
        <Pagination page={page} totalPages={totalPages} onChange={onPage} />
      </div>
    </>
  )
}
