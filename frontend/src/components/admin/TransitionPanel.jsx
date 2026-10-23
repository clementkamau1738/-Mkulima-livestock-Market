import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { TRANSITION_UI, transitionLabel } from '../../content/workflows'
import { useSubmission } from '../../hooks/useSubmission'
import { TRANSITION_FIELDS } from '../../services/adminService'
import Button from '../ui/Button'
import Checkbox from '../ui/Checkbox'
import { TextAreaField, TextField } from '../ui/Field'
import FormError from '../ui/FormError'
import Modal from '../ui/Modal'

function TransitionForm({ kind, from, to, onSubmit, onDone, onCancel }) {
  const ui = TRANSITION_UI[kind]?.[to] ?? {}
  const label = transitionLabel(kind, from, to)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { reason: '', confirmed: false, externalReference: '' } })
  const { onSubmit: submit, formError } = useSubmission({
    submit: (values) => onSubmit({ status: to, ...values }),
    fieldMap: TRANSITION_FIELDS,
    setError,
    onSuccess: onDone,
  })

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
      {ui.externalReference && (
        <TextField
          label="Payout reference"
          hint="The transaction code from the provider's confirmation."
          autoCapitalize="characters"
          error={errors.externalReference?.message}
          {...register('externalReference', {
            required: 'Enter the payout reference',
            pattern: { value: /^[A-Za-z0-9-]{4,60}$/, message: 'Use 4 to 60 letters, numbers or hyphens' },
          })}
        />
      )}
      <TextAreaField
        label="Reason or note"
        optional={ui.reason !== 'required'}
        hint="Shown to the customer in their status history."
        rows={3}
        error={errors.reason?.message}
        {...register('reason', {
          required: ui.reason === 'required' ? 'Give a reason the customer can read' : false,
          maxLength: { value: 1000, message: 'Keep this under 1000 characters' },
        })}
      />
      {ui.confirm && (
        <Checkbox label={ui.confirm} error={errors.confirmed?.message} {...register('confirmed', { required: 'Confirm the check before continuing' })} />
      )}
      <FormError message={formError} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant={ui.danger ? 'danger' : 'primary'} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : label}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// Offers the status changes the server says are allowed. `onSubmit` sends
// one to the API; repeating it is harmless because the server is idempotent.
export default function TransitionPanel({ kind, status, allowed, onSubmit, onChanged }) {
  const [target, setTarget] = useState(null)
  const close = () => setTarget(null)

  return (
    <section aria-labelledby="actions" className="rounded-3xl border border-line/80 bg-white p-6">
      <h2 id="actions" className="font-display text-lg font-semibold text-ink">
        Actions
      </h2>
      {allowed.length === 0 ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-ink-muted">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-forest" />
          This record is in a final state. No further status changes are possible.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {allowed.map((to) => (
            <Button key={to} variant={TRANSITION_UI[kind]?.[to]?.danger ? 'danger' : 'primary'} onClick={() => setTarget(to)}>
              {transitionLabel(kind, status, to)}
            </Button>
          ))}
        </div>
      )}
      <Modal open={target !== null} onClose={close} title={target ? transitionLabel(kind, status, target) : ''}>
        {target && (
          <TransitionForm
            kind={kind}
            from={status}
            to={target}
            onSubmit={onSubmit}
            onCancel={close}
            onDone={(record) => {
              close()
              toast.success('Status updated.')
              onChanged(record)
            }}
          />
        )}
      </Modal>
    </section>
  )
}
