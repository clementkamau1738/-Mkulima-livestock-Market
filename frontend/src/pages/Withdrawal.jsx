import { Info } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import SignInRequired from '../components/auth/SignInRequired'
import RequestConfirmation from '../components/requests/RequestConfirmation'
import StatusGuide from '../components/requests/StatusGuide'
import Button from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import { TextAreaField, TextField } from '../components/ui/Field'
import FormError from '../components/ui/FormError'
import PageHeader from '../components/ui/PageHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSubmission } from '../hooks/useSubmission'
import { WITHDRAWAL_FIELDS, submitWithdrawal } from '../services/requestService'
import { rules } from '../utils/validation'

const STATUSES = [
  { status: 'pending', text: 'Waiting for an administrator to review the request and confirm you are entitled to the funds.' },
  { status: 'approved', text: 'Approved for payout. It has not been paid yet.' },
  { status: 'processing', text: 'The payout is being sent to your destination.' },
  { status: 'completed', text: 'The payout was sent and confirmed.' },
  { status: 'rejected', text: 'The request was declined after review. We will explain why.' },
  { status: 'failed', text: 'The payout could not be completed. Our team will contact you.' },
]

const METHODS = [
  { value: 'mpesa', label: 'M-Pesa mobile number' },
  { value: 'bank', label: 'Bank account' },
]

function WithdrawalForm({ user }) {
  const [receipt, setReceipt] = useState(null)
  const defaultValues = {
    fullName: user.fullName,
    phone: user.phone,
    amount: '',
    method: 'mpesa',
    mpesaNumber: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    reason: '',
    acknowledge: false,
  }
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    shouldUnregister: true,
  })
  const method = useWatch({ control, name: 'method' })

  const { onSubmit, formError, resetSubmission } = useSubmission({
    submit: submitWithdrawal,
    fieldMap: WITHDRAWAL_FIELDS,
    setError,
    onSuccess: setReceipt,
  })

  return receipt ? (
    <RequestConfirmation
      title="Withdrawal request submitted"
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
        <strong className="text-ink">No money has been sent.</strong> An administrator will review your request and confirm the amount you are owed before any payout is made.
      </p>
      <p>
        Keep your reference number. You can follow the review from{' '}
        <Link to="/account?tab=withdrawals" className="font-semibold text-forest underline">
          your dashboard
        </Link>
        .
      </p>
    </RequestConfirmation>
  ) : (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 rounded-3xl border border-line/80 bg-white p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName', rules.fullName)} />
        <TextField label="Phone number" type="tel" autoComplete="tel" placeholder="0712 345 678" error={errors.phone?.message} {...register('phone', rules.phone)} />
      </div>
      <TextField label="Amount" prefix="KES" inputMode="decimal" placeholder="5000" error={errors.amount?.message} {...register('amount', rules.amountKes)} />

      <fieldset>
        <legend className="text-sm font-semibold text-ink">Send the payout to</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {METHODS.map((m) => (
            <label
              key={m.value}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 py-3 text-sm font-semibold has-checked:border-forest has-checked:bg-forest/5"
            >
              <input type="radio" value={m.value} className="size-4 accent-forest" {...register('method')} />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      {method === 'mpesa' ? (
        <TextField
          label="M-Pesa number"
          type="tel"
          hint="Must be registered in your own name."
          placeholder="0712 345 678"
          error={errors.mpesaNumber?.message}
          {...register('mpesaNumber', rules.phone)}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Bank name" error={errors.bankName?.message} {...register('bankName', { required: 'Enter your bank name' })} />
          <TextField label="Account name" hint="Must match your full name." error={errors.accountName?.message} {...register('accountName', rules.fullName)} />
          <TextField
            label="Account number"
            inputMode="numeric"
            error={errors.accountNumber?.message}
            {...register('accountNumber', {
              required: 'Enter your account number',
              pattern: { value: /^\d{6,20}$/, message: 'Use 6 to 20 digits' },
            })}
          />
        </div>
      )}

      <TextAreaField label="Reason or notes" optional rows={3} error={errors.reason?.message} {...register('reason', rules.notes)} />
      <Checkbox
        label="I understand no money is sent until an administrator approves and processes this request."
        error={errors.acknowledge?.message}
        {...register('acknowledge', { required: 'Please confirm you understand how withdrawals are reviewed' })}
      />
      <FormError message={formError} />
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit withdrawal request'}
      </Button>
    </form>
  )
}

export default function Withdrawal() {
  useDocumentTitle('Withdrawal request')
  return (
    <div className="container-page pt-10 sm:pt-14">
      <PageHeader eyebrow="Payments" title="Request a withdrawal">
        Ask for funds owed to you to be paid out. Every request is reviewed by an administrator before anything is sent.
      </PageHeader>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SignInRequired
            title="Sign in to request a withdrawal"
            message="Withdrawals are only reviewed for signed-in account holders, so we can confirm who is asking and what they are owed."
          >
            {(user) => <WithdrawalForm user={user} />}
          </SignInRequired>
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="balance" className="rounded-3xl bg-forest p-6 text-cream">
            <h2 id="balance" className="flex items-center gap-2 font-display text-xl font-semibold">
              <Info aria-hidden="true" className="size-5 text-lime" />
              About balances
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-cream/85">
              Mkulima does not hold a wallet balance for you, so none is shown here. A withdrawal request asks our team to check what you are owed, for example a refund on a cancelled purchase. Funds are only paid out after that check.
            </p>
          </section>
          <StatusGuide items={STATUSES} />
        </aside>
      </div>
    </div>
  )
}
