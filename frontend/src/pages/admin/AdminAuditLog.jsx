import AdminFilters from '../../components/admin/AdminFilters'
import AdminHeader from '../../components/admin/AdminHeader'
import AdminTable from '../../components/admin/AdminTable'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useListParams } from '../../hooks/useListParams'
import { listAuditLog } from '../../services/adminService'
import { formatDateTime } from '../../utils/format'

const AREAS = [
  { value: 'depositrequest', label: 'Deposits' },
  { value: 'withdrawalrequest', label: 'Withdrawals' },
  { value: 'purchaseinquiry', label: 'Inquiries' },
  { value: 'listing', label: 'Listings' },
  { value: 'account', label: 'Accounts' },
]

const columns = [
  { key: 'at', header: 'When', render: (row) => formatDateTime(row.at), className: 'whitespace-nowrap text-ink-muted' },
  { key: 'actor', header: 'By', render: (row) => row.actor?.fullName ?? 'System' },
  { key: 'action', header: 'Action', render: (row) => <code className="rounded bg-cream px-1.5 py-0.5 text-xs">{row.action}</code> },
  {
    key: 'summary',
    header: 'Summary',
    render: (row) => (
      <details>
        <summary className="cursor-pointer">{row.summary}</summary>
        <pre className="mt-2 max-w-md overflow-x-auto rounded-lg bg-cream p-2 text-xs whitespace-pre-wrap">{JSON.stringify(row.changes, null, 2)}</pre>
      </details>
    ),
  },
  { key: 'ip', header: 'IP address', render: (row) => row.ipAddress ?? '', className: 'whitespace-nowrap text-ink-muted' },
]

export default function AdminAuditLog() {
  useDocumentTitle('Audit log')
  const list = useListParams(['q', 'action'])
  const result = useAsync(() => listAuditLog({ ...list.values, page: list.page }), `audit:${list.key}`)
  return (
    <>
      <AdminHeader title="Audit log" description="Every staff action on listings, requests and accounts. Entries cannot be edited or deleted." />
      <AdminFilters
        search={list.values.q}
        searchLabel="Search summary or staff email"
        onSearch={(q) => list.setFilter('q', q)}
        selects={[{ label: 'Area', value: list.values.action, onChange: (v) => list.setFilter('action', v), options: AREAS }]}
      />
      <AdminTable caption="Audit log" columns={columns} result={result} rowKey={(row) => row.id} onPage={list.setPage} />
    </>
  )
}
