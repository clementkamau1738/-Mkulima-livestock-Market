import { Search } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import StatusTimeline from '../components/requests/StatusTimeline'
import Button from '../components/ui/Button'
import { TextField } from '../components/ui/Field'
import FormError from '../components/ui/FormError'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSubmission } from '../hooks/useSubmission'
import { TRACK_FIELDS, trackInquiry } from '../services/requestService'
import { formatDate } from '../utils/format'
import { rules } from '../utils/validation'

// What each status means for the buyer. Nothing here implies a sale or payment.
const STATUS_HELP = {
  pending: 'Our team has your inquiry and will contact you on the phone number you gave.',
  contacted: 'Our team has been in touch. Reply to them to arrange verification or a viewing.',
  viewing_arranged: 'A viewing or verification has been arranged. Payment is only ever confirmed through the process our team explains to you.',
  completed: 'This inquiry is closed.',
  cancelled: 'This inquiry was cancelled. If the animal is still listed, you can send a new inquiry from its page.',
}

function Result({ inquiry }) {
  return (
    <section aria-labelledby="result-heading" className="rounded-3xl border border-line/80 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="result-heading" className="font-mono text-lg font-semibold text-forest">
          {inquiry.reference}
        </h2>
        <StatusBadge status={inquiry.status} />
      </div>
      <p className="mt-3 text-sm text-ink-muted">
        {inquiry.listing && (
          <>
            For{' '}
            <Link to={`/marketplace/${inquiry.listing.id}`} className="font-semibold text-forest hover:underline">
              {inquiry.listing.title}
            </Link>
            ,{' '}
          </>
        )}
        sent {formatDate(inquiry.createdAt)}.
      </p>
      <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-ink">{STATUS_HELP[inquiry.status]}</p>
      <h3 className="mt-6 mb-3 text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">Status history</h3>
      <StatusTimeline history={inquiry.history} />
    </section>
  )
}

export default function TrackInquiry() {
  useDocumentTitle('Track an inquiry')
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [inquiry, setInquiry] = useState(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { reference: params.get('reference') ?? '', phone: '' } })

  const { onSubmit, formError } = useSubmission({
    submit: (values) => trackInquiry(values),
    fieldMap: TRACK_FIELDS,
    setError,
    onSuccess: setInquiry,
  })

  return (
    <div className="container-page pt-10 sm:pt-14">
      <PageHeader eyebrow="Purchase inquiries" title="Track an inquiry">
        Enter the reference number from your confirmation and the phone number you used. You will see the status only, never the details you sent.
      </PageHeader>

      <div className="mt-10 grid gap-8 lg:grid-cols-[22rem_1fr]">
        <div>
          <form
            onSubmit={handleSubmit(async (values) => {
              setInquiry(null)
              await onSubmit(values)
            })}
            noValidate
            className="space-y-4 rounded-3xl border border-line/80 bg-white p-6"
          >
            <TextField
              label="Reference number"
              placeholder="INQ-7KQ2M9XP"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              error={errors.reference?.message}
              {...register('reference', rules.inquiryReference)}
            />
            <TextField
              label="Phone number"
              type="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
              error={errors.phone?.message}
              {...register('phone', rules.phone)}
            />
            <FormError message={formError} />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Search aria-hidden="true" className="size-4" />
              {isSubmitting ? 'Checking…' : 'Check status'}
            </Button>
          </form>
          {user && (
            <p className="mt-4 text-sm text-ink-muted">
              Inquiries you send while signed in are also on{' '}
              <Link to="/account?tab=inquiries" className="font-semibold text-forest hover:underline">
                your dashboard
              </Link>
              .
            </p>
          )}
        </div>
        <div aria-live="polite">{inquiry && <Result inquiry={inquiry} />}</div>
      </div>
    </div>
  )
}
