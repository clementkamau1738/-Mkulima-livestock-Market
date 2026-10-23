import { useState } from 'react'

// Local editable copy of a value that also resets when the source value
// changes from outside (e.g. the URL is edited or filters are cleared).
export function useSyncedDraft(source) {
  const [draft, setDraft] = useState(source)
  const [lastSource, setLastSource] = useState(source)
  if (source !== lastSource) {
    setLastSource(source)
    setDraft(source)
  }
  return [draft, setDraft]
}
