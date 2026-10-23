import { CircleAlert } from 'lucide-react'

export default function FormError({ message }) {
  if (!message) return null
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  )
}
