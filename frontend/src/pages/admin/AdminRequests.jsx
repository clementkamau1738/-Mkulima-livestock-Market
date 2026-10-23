import { Link } from 'react-router'
import AdminFilters from '../../components/admin/AdminFilters'
import AdminHeader from '../../components/admin/AdminHeader'
import AdminTable from '../../components/admin/AdminTable'
import StatusBadge from '../../components/ui/StatusBadge'
import { STATUS_FILTERS } from '../../content/workflows'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useListParams } from '../../hooks/useListParams'
import { listRequests } from '../../services/adminService'
import { formatDate, formatStatus } from '../../utils/format'
import { REQUEST_KINDS } from './requestKinds'

export default function AdminRequests({ kind }) {
  const config = REQUEST_KINDS[kind]
  useDocumentTitle(config.title)
  const list = useListParams(['q', 'status'])
  const result = useAsync(() => listRequests(kind, { ...list.values, page: list.page }), `${kind}:${list.key}`)

  const columns = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <Link to={`/admin/${kind}/${row.reference}`} className="font-mono font-semibold text-forest hover:underline">
          {row.reference}
        </Link>
      ),
    },
    { key: 'name', header: 'Customer', render: (row) => <span className="font-semibold text-ink">{row.fullName}</span> },
    { key: 'detail', header: config.detailHeader, render: config.detail, className: 'text-ink-muted' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created', header: 'Submitted', render: (row) => formatDate(row.createdAt), className: 'whitespace-nowrap text-ink-muted' },
  ]

  return (
    <>
      <AdminHeader title={config.title} description={config.description} />
      <AdminFilters
        search={list.values.q}
        searchLabel="Search by reference, name, phone or email"
        onSearch={(q) => list.setFilter('q', q)}
        selects={[
          {
            label: 'Status',
            value: list.values.status,
            onChange: (v) => list.setFilter('status', v),
            options: STATUS_FILTERS[kind].map((s) => ({ value: s, label: formatStatus(s) })),
          },
        ]}
      />
      <AdminTable caption={config.title} columns={columns} result={result} rowKey={(row) => row.reference} onPage={list.setPage} />
    </>
  )
}
