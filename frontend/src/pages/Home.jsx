import { ArrowRight, Eye, Lock, Search, ShieldCheck, Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import ListingGrid, { ListingGridSkeleton } from '../components/livestock/ListingGrid'
import SearchForm from '../components/livestock/SearchForm'
import Button from '../components/ui/Button'
import { ErrorState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { categoryImage } from '../content/categoryImages'
import { STEPS } from '../content/howItWorks'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { getCategories, getFeaturedLivestock } from '../services/livestockService'

const FEATURED_GRID = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-4'

const TRUST_POINTS = [
  {
    icon: Eye,
    title: 'See the animal first',
    text: 'Arrange a viewing or an independent vet check before you commit. Listings show only details the seller has provided.',
  },
  {
    icon: ShieldCheck,
    title: 'Reviewed by people',
    text: 'Every deposit and withdrawal request is checked by an administrator. Nothing is approved automatically.',
  },
  {
    icon: Wallet,
    title: 'No payment is assumed',
    text: 'Submitting a form never means money has moved. A request stays pending until the payment is independently verified.',
  },
  {
    icon: Lock,
    title: 'Private by default',
    text: 'Seller contact details and your own information are shared only when there is a reason to, never published openly.',
  },
]

function SectionHeading({ eyebrow, title, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-forest/70 uppercase">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}

function Featured() {
  const featured = useAsync(() => getFeaturedLivestock(4), 'featured')
  return (
    <section aria-labelledby="featured" className="container-page mt-20">
      <SectionHeading
        eyebrow="Fresh on the market"
        title={<span id="featured">Featured livestock</span>}
        action={
          <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline">
            View all listings <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
      />
      <div className="mt-8">
        {featured.status === 'loading' && <ListingGridSkeleton count={4} columns={FEATURED_GRID} />}
        {featured.status === 'error' && <ErrorState message="Featured listings could not be loaded." onRetry={featured.retry} />}
        {featured.status === 'success' && <ListingGrid listings={featured.data} columns={FEATURED_GRID} />}
      </div>
    </section>
  )
}

function Categories() {
  const categories = useAsync(getCategories, 'categories')
  return (
    <section aria-labelledby="categories" className="container-page mt-24">
      <SectionHeading eyebrow="Shop by need" title={<span id="categories">Browse by category</span>} />
      {categories.status === 'error' && (
        <div className="mt-8">
          <ErrorState message="Categories could not be loaded." onRetry={categories.retry} />
        </div>
      )}
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {(categories.data ?? []).map((c) => (
          <li key={c.slug}>
            <Link
              to={`/marketplace?category=${c.slug}`}
              className="group block overflow-hidden rounded-3xl border border-line/80 bg-white shadow-card transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              <img src={categoryImage(c.slug)} alt="" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="p-5">
                <h3 className="flex items-center justify-between font-display text-xl font-semibold text-ink">
                  {c.name}
                  <ArrowRight aria-hidden="true" className="size-5 text-forest transition-transform group-hover:translate-x-1" />
                </h3>
                <p className="mt-1 text-sm text-ink-muted">{c.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Home() {
  useDocumentTitle(null)
  const navigate = useNavigate()

  return (
    <>
      <section className="relative overflow-hidden bg-forest text-cream">
        <div aria-hidden="true" className="absolute -top-40 -right-32 size-[34rem] rounded-full bg-lime/10 blur-3xl" />
        <div className="container-page relative grid items-center gap-12 pt-14 pb-28 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-36">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-lime">
              <span className="size-1.5 rounded-full bg-lime" aria-hidden="true" />
              Livestock marketplace for Kenyan farmers
            </p>
            <h1 className="mt-6 font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Find the right animal for your farm, <span className="text-lime italic">and buy with clarity.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/80">
              Browse dairy cows, beef cattle, bulls and calves from farms across Kenya. Ask questions, arrange a viewing, and pay only through a process our team verifies.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/marketplace" variant="accent" size="lg">
                Browse Livestock <ArrowRight aria-hidden="true" className="size-5" />
              </Button>
              <Button to="/how-it-works" size="lg" className="border border-cream/30 bg-transparent text-cream hover:bg-white/10">
                How it works
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src="/images/site/hero-herd.svg"
              alt="Illustration of cattle grazing on a Kenyan farm at sunset"
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-2xl ring-1 ring-white/10"
            />
            <div className="absolute -bottom-6 left-4 flex max-w-xs items-start gap-3 rounded-2xl bg-white p-4 text-ink shadow-xl sm:-left-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime text-forest">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </span>
              <p className="text-sm leading-snug">
                <strong className="block font-semibold">Every money request is reviewed</strong>
                <span className="text-ink-muted">by a person before it is approved.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Search livestock" className="container-page relative -mt-12">
        <div className="rounded-[2rem] border border-line/80 bg-cream p-4 shadow-xl sm:p-6">
          <SearchForm size="lg" onSearch={(q) => navigate(q ? `/marketplace?q=${encodeURIComponent(q)}` : '/marketplace')} />
          <p className="mt-3 px-2 text-sm text-ink-muted">
            Try <Link className="font-semibold text-forest underline-offset-2 hover:underline" to="/marketplace?q=Friesian">Friesian</Link>,{' '}
            <Link className="font-semibold text-forest underline-offset-2 hover:underline" to="/marketplace?q=Boran">Boran</Link> or{' '}
            <Link className="font-semibold text-forest underline-offset-2 hover:underline" to="/marketplace?q=Kiambu">Kiambu</Link>
          </p>
        </div>
      </section>

      <Featured />
      <Categories />

      <section aria-labelledby="how" className="container-page mt-24">
        <div className="rounded-[2rem] bg-white p-6 shadow-card sm:p-10 lg:p-14">
          <SectionHeading
            eyebrow="Simple and supervised"
            title={<span id="how">How buying works</span>}
            action={
              <Link to="/how-it-works" className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline">
                Full guide <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            }
          />
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="grid size-11 place-items-center rounded-2xl bg-forest text-cream">
                  <step.icon aria-hidden="true" className="size-5" />
                </span>
                <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">Step {i + 1}</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.short}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="trust" className="container-page mt-24">
        <SectionHeading eyebrow="Responsible trading" title={<span id="trust">Built for trust, not shortcuts</span>} />
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((p) => (
            <li key={p.title} className="rounded-3xl border border-line/80 bg-white p-6">
              <p.icon aria-hidden="true" className="size-6 text-forest" />
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-lime px-6 py-12 text-forest sm:px-12 lg:flex lg:items-center lg:justify-between lg:py-16">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Ready to find your next animal?</h2>
            <p className="mt-3 text-forest/80">Browse current listings, compare breeds and prices, and send an inquiry when something fits.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 lg:mt-0">
            <Button to="/marketplace" size="lg">
              <Search aria-hidden="true" className="size-5" /> Browse Livestock
            </Button>
            <Button to="/register" variant="outline" size="lg" className="border-forest/30 bg-transparent hover:bg-white/40">
              Create an account
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
