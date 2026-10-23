import { ChevronDown } from 'lucide-react'
import { useId } from 'react'

const controlClasses =
  'block w-full rounded-xl border bg-white px-3.5 py-2.5 text-ink placeholder:text-ink-muted/70 transition-colors ' +
  'focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20 disabled:bg-cream-200'

function useFieldIds(id) {
  const generated = useId()
  const fieldId = id ?? generated
  return { fieldId, hintId: `${fieldId}-hint`, errorId: `${fieldId}-error` }
}

function FieldShell({ label, fieldId, hint, hintId, error, errorId, optional, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-muted">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(hint, error, hintId, errorId) {
  if (error) return errorId
  return hint ? hintId : undefined
}

export function TextField({ label, hint, error, optional, id, prefix, className = '', ...props }) {
  const ids = useFieldIds(id)
  const input = (
    <input
      id={ids.fieldId}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy(hint, error, ids.hintId, ids.errorId)}
      className={`${controlClasses} ${error ? 'border-danger' : 'border-line'} ${prefix ? 'pl-14' : ''} ${className}`}
      {...props}
    />
  )
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} {...ids}>
      {prefix ? (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-semibold text-ink-muted">
            {prefix}
          </span>
          {input}
        </div>
      ) : (
        input
      )}
    </FieldShell>
  )
}

export function TextAreaField({ label, hint, error, optional, id, rows = 4, ...props }) {
  const ids = useFieldIds(id)
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} {...ids}>
      <textarea
        id={ids.fieldId}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(hint, error, ids.hintId, ids.errorId)}
        className={`${controlClasses} ${error ? 'border-danger' : 'border-line'} resize-y`}
        {...props}
      />
    </FieldShell>
  )
}

export function SelectField({ label, hint, error, optional, id, children, ...props }) {
  const ids = useFieldIds(id)
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} {...ids}>
      <div className="relative">
        <select
          id={ids.fieldId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(hint, error, ids.hintId, ids.errorId)}
          className={`${controlClasses} ${error ? 'border-danger' : 'border-line'} appearance-none pr-10`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted"
        />
      </div>
    </FieldShell>
  )
}
