import PageHeader from '../components/ui/PageHeader'
import SampleNotice from '../components/ui/SampleNotice'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function LegalPage({ title, sections }) {
  useDocumentTitle(title)
  return (
    <div className="container-page pt-10 sm:pt-14">
      <PageHeader eyebrow="Policies" title={title} />
      <SampleNotice className="mt-6 max-w-3xl">
        Draft placeholder. This text is an outline only and must be replaced with a version reviewed by a qualified legal advisor before launch.
      </SampleNotice>
      <div className="mt-10 max-w-3xl space-y-8">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-2xl font-semibold text-ink">{s.heading}</h2>
            <p className="mt-3 leading-relaxed text-ink-muted">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
