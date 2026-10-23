import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, description, children }) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Depends on `open` only, so re-renders of the parent never steal focus.
  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    const panel = panelRef.current
    panel.querySelector(FOCUSABLE)?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      } else if (event.key === 'Tab') {
        const items = [...panel.querySelectorAll(FOCUSABLE)]
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-forest-950/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-2xl font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-m-2 rounded-full p-2 text-ink-muted hover:bg-cream hover:text-ink focus-visible:outline-2 focus-visible:outline-forest"
            aria-label="Close dialog"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
