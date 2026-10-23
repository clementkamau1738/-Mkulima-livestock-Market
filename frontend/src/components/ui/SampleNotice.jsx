import { Info } from 'lucide-react'

export default function SampleNotice({ children, className = '' }) {
  return (
    <p className={`flex items-start gap-2 rounded-2xl bg-lime/40 px-4 py-3 text-sm text-forest ${className}`}>
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
