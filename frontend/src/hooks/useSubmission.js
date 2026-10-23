import { useCallback, useRef, useState } from 'react'
import { mapFieldErrors } from '../services/mappers'
import { uuid } from '../utils/uuid'

// Wraps a form submit so that:
// - a second submit while one is in flight is ignored (double clicks);
// - every retry of the same submission reuses one idempotency key, so the
//   server returns the original record instead of creating a duplicate;
// - server field errors land on the matching inputs, everything else in
//   `formError` for an inline alert.
export function useSubmission({ submit, fieldMap, setError, onSuccess }) {
  const inFlight = useRef(false)
  const keyRef = useRef(null)
  const [formError, setFormError] = useState(null)

  const onSubmit = useCallback(
    async (values) => {
      if (inFlight.current) return
      inFlight.current = true
      keyRef.current ??= uuid()
      setFormError(null)
      try {
        const result = await submit(values, keyRef.current)
        keyRef.current = null
        onSuccess(result)
      } catch (error) {
        const { known, other } = mapFieldErrors(error.fields, fieldMap)
        Object.entries(known).forEach(([name, message]) => setError(name, { type: 'server', message }, { shouldFocus: true }))
        const hasFieldErrors = Object.keys(known).length > 0
        setFormError(other[0] ?? (hasFieldErrors ? 'Please correct the highlighted fields.' : error.message))
      } finally {
        inFlight.current = false
      }
    },
    [submit, fieldMap, setError, onSuccess],
  )

  // Call when starting a brand-new submission (e.g. "Submit another").
  const resetSubmission = useCallback(() => {
    keyRef.current = null
    setFormError(null)
  }, [])

  return { onSubmit, formError, resetSubmission }
}
