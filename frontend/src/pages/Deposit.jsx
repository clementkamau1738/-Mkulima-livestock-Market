import { ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import SignInRequired from '../components/auth/SignInRequired'
import RequestConfirmation from '../components/requests/RequestConfirmation'
import StatusGuide from '../components/requests/StatusGuide'
import Button from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import { TextAreaField, TextField } from '../components/ui/Field'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import FormError from '../components/ui/FormError'
import { ErrorState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSubmission } from '../hooks/useSubmission'
import { DEPOSIT_FIELDS, getPaymentInstructions, submitDeposit } from '../services/requestService'
import { rules } from '../utils/validation'

const STATUSES = [
  { status: 'pending', text: 'Received by us and waiting for an administrator to verify the payment. No funds are confirmed at this stage.' },
  { status: 'approved', text: 'An administrator matched your payment reference to a verified payment.' },
  { status: 'rejected', text: 'The payment could not be verified. We will tell you why and what to do next.' },
]

function Instructions() {
  const result = useAsync(getPaymentInstructions, 'payment-instructions')
  if (result.status === 'loading') return <Skeleton className="h-72 rounded-3xl" />
  if (result.status === 'error') return <ErrorState message="Payment instructions could not be loaded." onRetry={result.retry} />
  const info = result.data
  return (
    <section aria-labelledby="instructions" className="rounded-3xl bg-forest p-6 text-cream">
      <h2 id="instructions" className="font-display text-xl font-semibold">
        {info.title}
      </h2>
      {info.isPlaceholder && (
        <p className="mt-3 rounded-xl bg-lime/15 px-3 py-2 text-xs font-semibold text-lime">
          Placeholder: official payment details have not been published yet. Do not send money until they appear here.
        </p>
      )}
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-cream/85">
        {info.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <dl className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm">
        {info.methods.map((m) => (
          <div key={m.label}>
            <dt className="text-cream/70">{m.label}</dt>
            <dd className="font-semibold">{m.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 flex gap-2 text-xs text-cream/75">
        <ShieldAlert aria-hidden="true" className="size-4 shrink-0 text-lime" />
        {info.note}
      </p>
    </section>
  )
}

function DepositForm({ user }) {
  const [receipt, setReceipt] = useState(null)
  const defaultValues = { fullName: user.fullName, phone: user.phone, amount: '', paymentReference: '', notes: '', acknowledge: false }
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues })
  const { onSubmit, formError, resetSubmission } = useSubmission({
    submit: submitDeposit,
    fieldMap: DEPOSIT_FIELDS,
    setError,
    onSuccess: setReceipt,
  })

  return receipt ? (
    <RequestConfirmation
      title="Deposit request submitted"
      receipt={receipt}
      actions={
        <Button
          variant="outline"
          onClick={() => {
            reset(defaultValues)
            resetSubmission()
            setReceipt(null)
          }}
        >
          Submit another request
        </Button>
      }
    >
      <p>
        <strong className="text-ink">We have not confirmed receiving any money.</strong> Your request stays pending until an administrator independently verifies the payment reference you gave.
      </p>
      <p>
        Keep your reference number. You can follow the review from{' '}
        <Link to="/account?tab=deposits" className="font-semibold text-forest underline">
          your dashboard
        </Link>
        .
      </p>
      <p>We will update the status only after the review. Approval is the only point at which a deposit counts as received.</p>
    </RequestConfirmation>
  ) : (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 rounded-3xl border border-line/80 bg-white p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName', rules.fullName)} />
        <TextField label="Phone number" type="tel" autoComplete="tel" placeholder="0712 345 678" error={errors.phone?.message} {...register('phone', rules.phone)} />
      </div>
      <TextField label="Amount" prefix="KES" inputMode="decimal" placeholder="5000" error={errors.amount?.message} {...register('amount', rules.amountKes)} />
      <TextField
        label="Payment reference"
        hint="The transaction code from your M-Pesa message or bank receipt."
        placeholder="e.g. TJK4XXXXXX"
        autoCapitalize="characters"
        error={errors.paymentReference?.message}
        {...register('paymentReference', {
          required: 'Enter the payment reference from your confirmation',
          pattern: { value: /^[A-Za-z0-9-]{6,30}$/, message: 'Use 6 to 30 letters, numbers or hyphens' },
        })}
      />
      <TextAreaField label="Notes" optional rows={3} error={errors.notes?.message} {...register('notes', rules.notes)} />
      <Checkbox
        label="I understand this request will stay pending until an administrator verifies my payment."
        error={errors.acknowledge?.message}
        {...register('acknowledge', { required: 'Please confirm you understand how deposits are reviewed' })}
      />
      <FormError message={formError} />
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit deposit request'}
      </Button>
    </form>
  )
}

export default function Deposit() {
  useDocumentTitle('Deposit request')
  return (
    <div className="container-page pt-10 sm:pt-14">
      <PageHeader eyebrow="Payments" title="Submit a deposit request">
        Already paid using the official details? Tell us your payment reference so an administrator can verify it.
      </PageHeader>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SignInRequired
            title="Sign in to submit a deposit request"
            message="Deposit requests are linked to your account so only you can follow them, and so our team can reach you about the review."
          >
            {(user) => <DepositForm user={user} />}
          </SignInRequired>
        </div>

        <aside className="order-first space-y-6 lg:order-none">
          <Instructions />
          <StatusGuide items={STATUSES} />
        </aside>
      </div>
    </div>
  )
}
