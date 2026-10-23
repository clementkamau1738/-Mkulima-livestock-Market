import PageHeader from '../components/ui/PageHeader'
import credits from '../content/photoCredits.json'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

// Every bundled photo is openly licensed (Wikimedia Commons). Licences such
// as CC BY and CC BY-SA require naming the author and licence, which this
// page does. Photos are resized and re-encoded only.
export default function PhotoCredits() {
  useDocumentTitle('Photo credits')
  return (
    <div className="container-page pt-10 sm:pt-14">
      <PageHeader eyebrow="About this site" title="Photo credits">
        The site and sample listings use openly licensed photographs from Wikimedia Commons. They show similar animals,
        not the animals in the fictional sample listings. Each photo was resized and cropped; no other changes were made.
      </PageHeader>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {credits.map((c) => (
          <li key={c.file} className="overflow-hidden rounded-2xl border border-line/80 bg-white">
            <img src={c.preview} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
            <div className="space-y-1 p-4 text-sm">
              <p className="font-semibold text-ink">{c.usedFor}</p>
              <p className="text-ink-muted">
                Photo by {c.author}, licensed{' '}
                {c.licenseUrl ? (
                  <a href={c.licenseUrl} className="font-semibold text-forest underline underline-offset-2" rel="license noreferrer" target="_blank">
                    {c.license}
                  </a>
                ) : (
                  c.license
                )}
                .
              </p>
              <a href={c.source} className="inline-block font-semibold text-forest underline underline-offset-2" rel="noreferrer" target="_blank">
                Original on Wikimedia Commons
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
