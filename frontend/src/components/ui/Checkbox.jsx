import { useId } from 'react'

export default function Checkbox({ label, error, ...props }) {
  const id = useId()
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 rounded border-line accent-forest"
          {...props}
        />
        <label htmlFor={id} className="text-sm text-ink">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
