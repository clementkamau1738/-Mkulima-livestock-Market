import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import AdminFilters from '../../components/admin/AdminFilters'
import AdminHeader from '../../components/admin/AdminHeader'
import AdminTable from '../../components/admin/AdminTable'
import Button from '../../components/ui/Button'
import { TextAreaField } from '../../components/ui/Field'
import FormError from '../../components/ui/FormError'
import Modal from '../../components/ui/Modal'
import StatusBadge from '../../components/ui/StatusBadge'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useListParams } from '../../hooks/useListParams'
import { useSubmission } from '../../hooks/useSubmission'
import { listAccounts, setAccountAccess } from '../../services/adminService'
import { formatDate } from '../../utils/format'

const ROLES = [
  { value: 'customer', label: 'Customer' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Administrator' },
]

function AccessForm({ account, onDone, onCancel }) {
  const suspending = account.isActive
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { reason: '' } })
  const { onSubmit, formError } = useSubmission({
    submit: ({ reason }) => setAccountAccess(account.id, { isActive: !suspending, reason }),
    fieldMap: { reason: 'reason' },
    setError,
    onSuccess: onDone,
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <p className="text-sm text-ink-muted">
        {suspending
          ? 'The person is signed out on their next request and cannot sign in until access is restored. Their records are kept.'
          : 'The person will be able to sign in again.'}
      </p>
      <TextAreaField
        label="Reason"
        hint="Kept in the audit log."
        rows={3}
        error={errors.reason?.message}
        {...register('reason', { required: suspending ? 'Give a reason for suspending this account' : false })}
      />
      <FormError message={formError} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant={suspending ? 'danger' : 'primary'} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : suspending ? 'Suspend account' : 'Restore access'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default function AdminCustomers() {
  useDocumentTitle('Customers')
  const { user } = useAuth()
  const list = useListParams(['q', 'role', 'active'])
  const result = useAsync(() => listAccounts({ ...list.values, page: list.page }), `accounts:${list.key}`)
  const [selected, setSelected] = useState(null)
  // Only shown to administrators; the server refuses everyone else anyway.
  const canManage = (row) => user.role === 'admin' && row.role !== 'admin' && row.id !== user.id

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <>
          <span className="block font-semibold text-ink">{row.fullName || 'No name given'}</span>
          <span className="block text-xs text-ink-muted">{row.email}</span>
        </>
      ),
    },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || 'Not given', className: 'whitespace-nowrap text-ink-muted' },
    { key: 'role', header: 'Role', render: (row) => ROLES.find((r) => r.value === row.role)?.label ?? row.role },
    { key: 'status', header: 'Access', render: (row) => <StatusBadge status={row.isActive ? 'active' : 'suspended'} /> },
    { key: 'joined', header: 'Joined', render: (row) => formatDate(row.joinedAt), className: 'whitespace-nowrap text-ink-muted' },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      render: (row) =>
        canManage(row) && (
          <Button
            size="sm"
            variant={row.isActive ? 'danger' : 'outline'}
            aria-label={`${row.isActive ? 'Suspend' : 'Restore'} ${row.email}`}
            onClick={() => setSelected(row)}
          >
            {row.isActive ? 'Suspend' : 'Restore'}
          </Button>
        ),
    },
  ]

  return (
    <>
      <AdminHeader
        title="Customers"
        description={user.role === 'admin' ? 'Look up accounts and suspend or restore access.' : 'Look up accounts. Only administrators can change access.'}
      />
      <AdminFilters
        search={list.values.q}
        searchLabel="Search name, email or phone"
        onSearch={(q) => list.setFilter('q', q)}
        selects={[
          { label: 'Role', value: list.values.role, onChange: (v) => list.setFilter('role', v), options: ROLES },
          {
            label: 'Access',
            value: list.values.active,
            onChange: (v) => list.setFilter('active', v),
            options: [
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Suspended' },
            ],
          },
        ]}
      />
      <AdminTable caption="Accounts" columns={columns} result={result} rowKey={(row) => row.id} onPage={list.setPage} />
      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.isActive ? 'Suspend account' : 'Restore access'} description={selected?.email}>
        {selected && (
          <AccessForm
            account={selected}
            onCancel={() => setSelected(null)}
            onDone={() => {
              setSelected(null)
              toast.success('Account access updated.')
              result.retry()
            }}
          />
        )}
      </Modal>
    </>
  )
}
