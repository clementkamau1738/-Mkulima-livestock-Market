import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import AuthCard from '../components/layout/AuthCard'
import Button from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import { TextField } from '../components/ui/Field'
import FormError from '../components/ui/FormError'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSubmission } from '../hooks/useSubmission'
import { REGISTER_FIELDS } from '../services/authService'
import { homeFor, safeNext } from '../utils/redirect'
import { rules } from '../utils/validation'

// Early feedback only; the server applies Django's full password validation
// (length, common passwords, numeric-only, similarity to your details).
const password = {
  required: 'Create a password',
  minLength: { value: 8, message: 'Use at least 8 characters' },
  validate: (v) => !/^\d+$/.test(v) || 'Password cannot be only numbers',
}

export default function Register() {
  useDocumentTitle('Create an account')
  const { status, user, signUp } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '', terms: false },
  })

  useEffect(() => {
    if (status === 'ready' && user) navigate(safeNext(next, homeFor(user)), { replace: true })
  }, [status, user, next, navigate])

  const { onSubmit, formError } = useSubmission({ submit: signUp, fieldMap: REGISTER_FIELDS, setError, onSuccess: () => {} })

  return (
    <AuthCard title="Create your account" subtitle="Track inquiries, deposits and withdrawals in one place.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName', rules.fullName)} />
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email', rules.email)} />
        <TextField label="Phone number" type="tel" autoComplete="tel" placeholder="0712 345 678" error={errors.phone?.message} {...register('phone', rules.phone)} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters. Avoid common passwords and your name or email."
          error={errors.password?.message}
          {...register('password', password)}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Confirm your password',
            validate: (v) => v === getValues('password') || 'Passwords do not match',
          })}
        />
        <Checkbox
          label={
            <>
              I agree to the{' '}
              <Link to="/terms" className="font-semibold text-forest underline">
                terms of use
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-semibold text-forest underline">
                privacy policy
              </Link>
              .
            </>
          }
          error={errors.terms?.message}
          {...register('terms', { required: 'You must accept the terms to continue' })}
        />
        <FormError message={formError} />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Already registered?{' '}
        <Link to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="font-semibold text-forest hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
