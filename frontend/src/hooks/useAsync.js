import { useCallback, useEffect, useRef, useState } from 'react'

// Runs `loader` whenever `key` changes and exposes its state. Loading is
// derived from the key, so stale results (key changed mid-flight or the
// component unmounted) are never shown.
export function useAsync(loader, key) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ requestKey: null })
  const loaderRef = useRef(loader)
  const requestKey = `${key}#${attempt}`

  useEffect(() => {
    loaderRef.current = loader
  })

  useEffect(() => {
    let active = true
    loaderRef.current().then(
      (data) => active && setResult({ requestKey, status: 'success', data, error: null }),
      (error) => active && setResult({ requestKey, status: 'error', data: null, error }),
    )
    return () => {
      active = false
    }
  }, [requestKey])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  if (result.requestKey !== requestKey) return { status: 'loading', data: null, error: null, retry }
  return { status: result.status, data: result.data, error: result.error, retry }
}
