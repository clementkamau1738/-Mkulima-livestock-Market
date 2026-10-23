import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import AuthCard from '../components/layout/AuthCard'
import Button from '../components/ui/Button'
import { TextField } from '../components/ui/Field'
import FormError from '../components/ui/FormError'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSubmission } from '../hooks/useSubmission'
import { LOGIN_FIELDS } from '../services/authService'
import { homeFor, safeNext } from '../utils/redirect'
import { rules } from '../utils/validation'

export default function Login() {
  useDocumentTitle('Sign in')
  const { status, user, signIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '' } })

  // Already signed in (or just signed in): go where the visitor was heading.
  useEffect(() => {
    if (status === 'ready' && user) navigate(safeNext(next, homeFor(user)), { replace: true })
  }, [status, user, next, navigate])

  const { onSubmit, formError } = useSubmission({ submit: signIn, fieldMap: LOGIN_FIELDS, setError, onSuccess: () => {} })

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to track your inquiries and requests.">
      {next && (
        <p className="mb-6 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-muted" role="status">
          Please sign in to continue.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email', rules.email)} />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Enter your password' })}
        />
        <FormError message={formError} />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        New to Mkulima?{' '}
        <Link to={next ? `/register?next=${encodeURIComponent(next)}` : '/register'} className="font-semibold text-forest hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}
