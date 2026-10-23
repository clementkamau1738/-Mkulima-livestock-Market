import { useForm } from 'react-hook-form'
import { useSubmission } from '../../hooks/useSubmission'
import { INQUIRY_FIELDS, submitInquiry } from '../../services/requestService'
import { rules } from '../../utils/validation'
import Button from '../ui/Button'
import { TextAreaField, TextField } from '../ui/Field'
import FormError from '../ui/FormError'

export default function InquiryForm({ listing, onSubmitted }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      message: `Hello, I am interested in "${listing.title}" in ${listing.location}. Please contact me to arrange a viewing.`,
    },
  })

  const { onSubmit, formError } = useSubmission({
    submit: (values, key) => submitInquiry({ listingId: listing.id, ...values }, key),
    fieldMap: INQUIRY_FIELDS,
    setError,
    onSuccess: onSubmitted,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName', rules.fullName)} />
      <TextField
        label="Phone number"
        type="tel"
        autoComplete="tel"
        placeholder="0712 345 678"
        error={errors.phone?.message}
        {...register('phone', rules.phone)}
      />
      <TextField label="Email" type="email" autoComplete="email" optional error={errors.email?.message} {...register('email', rules.optionalEmail)} />
      <TextAreaField
        label="Message"
        rows={4}
        error={errors.message?.message}
        {...register('message', {
          required: 'Enter a short message for the seller',
          minLength: { value: 10, message: 'Message must be at least 10 characters' },
          maxLength: { value: 1000, message: 'Keep your message under 1000 characters' },
        })}
      />
      <p className="text-xs text-ink-muted">
        An inquiry is not a purchase or a reservation. Our team reviews it and contacts you to arrange verification or a viewing.
      </p>
      <FormError message={formError} />
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending inquiry…' : 'Send inquiry'}
      </Button>
    </form>
  )
}
