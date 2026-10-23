import { useEffect } from 'react'
import { site } from '../config/site'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${site.name}` : site.name
  }, [title])
}
