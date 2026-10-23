import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import AdminFilters from '../../components/admin/AdminFilters'
import AdminHeader from '../../components/admin/AdminHeader'
import AdminTable from '../../components/admin/AdminTable'
import Button from '../../components/ui/Button'
import StatusBadge from '../../components/ui/StatusBadge'
import { STATUS_FILTERS } from '../../content/workflows'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useListParams } from '../../hooks/useListParams'
import { listListings } from '../../services/adminService'
import { getCategories } from '../../services/livestockService'
import { formatDate, formatKes, formatStatus } from '../../utils/format'

const columns = [
  {
    key: 'photo',
    header: <span className="sr-only">Photo</span>,
    render: (row) =>
      row.images[0] ? (
        <img src={row.images[0].src} alt="" className="size-12 rounded-lg object-cover" loading="lazy" />
      ) : (
        <span className="grid size-12 place-items-center rounded-lg bg-cream-200 text-[10px] font-semibold text-ink-muted">No photo</span>
      ),
  },
  {
    key: 'title',
    header: 'Listing',
    render: (row) => (
      <Link to={`/admin/listings/${row.id}`} className="font-semibold text-forest hover:underline">
        {row.title}
      </Link>
    ),
  },
  { key: 'category', header: 'Category', render: (row) => `${row.categoryName} · ${row.breed}`, className: 'text-ink-muted' },
  { key: 'price', header: 'Price', render: (row) => formatKes(row.priceKes), className: 'whitespace-nowrap' },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'updated', header: 'Updated', render: (row) => formatDate(row.updatedAt), className: 'whitespace-nowrap text-ink-muted' },
]

export default function AdminListings() {
  useDocumentTitle('Manage listings')
  const list = useListParams(['q', 'status', 'category'])
  const result = useAsync(() => listListings({ ...list.values, page: list.page }), `listings:${list.key}`)
  const categories = useAsync(getCategories, 'categories')

  return (
    <>
      <AdminHeader
        title="Listings"
        description="New listings start as drafts. Publish them once details and photos are checked."
        action={
          <Button to="/admin/listings/new">
            <Plus aria-hidden="true" className="size-4" />
            New listing
          </Button>
        }
      />
      <AdminFilters
        search={list.values.q}
        searchLabel="Search title, breed or location"
        onSearch={(q) => list.setFilter('q', q)}
        selects={[
          {
            label: 'Status',
            value: list.values.status,
            onChange: (v) => list.setFilter('status', v),
            options: STATUS_FILTERS.listings.map((s) => ({ value: s, label: formatStatus(s) })),
          },
          {
            label: 'Category',
            value: list.values.category,
            onChange: (v) => list.setFilter('category', v),
            options: (categories.data ?? []).map((c) => ({ value: c.slug, label: c.name })),
          },
        ]}
      />
      <AdminTable caption="Listings" columns={columns} result={result} rowKey={(row) => row.id} onPage={list.setPage} />
    </>
  )
}
