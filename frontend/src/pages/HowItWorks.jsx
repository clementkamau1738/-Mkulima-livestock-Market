import { ArrowDownToLine, ArrowUpFromLine, UserCheck } from 'lucide-react'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import { STEPS } from '../content/howItWorks'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const REVIEWED = [
  'Approving or rejecting a deposit request',
  'Approving, processing or rejecting a withdrawal request',
  'Sharing seller contact details with a buyer',
  'Publishing, reserving or marking a listing as sold',
]

export default function HowItWorks() {
  useDocumentTitle('How it works')
  return (
    <div className="container-page pt-10 sm:pt-14">
      <PageHeader eyebrow="Guide" title="How Mkulima works">
        From first search to a verified payment, here is what happens at each step and where a person on our team checks things.
      </PageHeader>

      <ol className="mt-12 space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="grid gap-4 rounded-3xl border border-line/80 bg-white p-6 sm:grid-cols-[auto_1fr] sm:gap-6 sm:p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-forest text-cream">
              <step.icon aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">Step {i + 1}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{step.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="deposits" className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
          <ArrowDownToLine aria-hidden="true" className="size-7 text-forest" />
          <h2 id="deposits" className="mt-4 font-display text-2xl font-semibold text-ink">
            Deposits
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-muted">
            <li>Pay using only the official details on the Deposit page.</li>
            <li>Submit a deposit request with the payment reference from your receipt.</li>
            <li>Your request is <strong className="text-ink">pending</strong>. Submitting it does not mean we have received money.</li>
            <li>An administrator checks the payment independently, then approves or rejects the request.</li>
          </ol>
          <Button to="/deposit" variant="outline" className="mt-6">
            Go to deposits
          </Button>
        </section>

        <section aria-labelledby="withdrawals" className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
          <ArrowUpFromLine aria-hidden="true" className="size-7 text-forest" />
          <h2 id="withdrawals" className="mt-4 font-display text-2xl font-semibold text-ink">
            Withdrawals
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-muted">
            <li>Submit a withdrawal request with the amount and where it should be paid.</li>
            <li>An administrator reviews whether the funds are owed to you, then approves or rejects it.</li>
            <li>Approved requests move to <strong className="text-ink">processing</strong> while the payout is sent.</li>
            <li>The request is marked completed only once the payout is confirmed.</li>
          </ol>
          <Button to="/withdraw" variant="outline" className="mt-6">
            Go to withdrawals
          </Button>
        </section>
      </div>

      <section aria-labelledby="review" className="mt-6 rounded-3xl bg-forest p-6 text-cream sm:p-8">
        <h2 id="review" className="flex items-center gap-3 font-display text-2xl font-semibold">
          <UserCheck aria-hidden="true" className="size-7 text-lime" />
          Always reviewed by an administrator
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {REVIEWED.map((item) => (
            <li key={item} className="rounded-2xl bg-white/5 px-4 py-3 text-sm">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-cream/75">Customers can never approve their own requests, and no status changes automatically when a form is submitted.</p>
      </section>
    </div>
  )
}
