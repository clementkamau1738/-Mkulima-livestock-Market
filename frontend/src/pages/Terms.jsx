import LegalPage from './LegalPage'

const SECTIONS = [
  { heading: 'Using the marketplace', body: 'Outline: who may use the service, account responsibilities, and acceptable use of listings and inquiries.' },
  { heading: 'Listings', body: 'Outline: listings show information supplied by sellers. Buyers should verify animals in person or through a veterinarian before purchase.' },
  { heading: 'Deposits and withdrawals', body: 'Outline: submitted requests remain pending until verified and reviewed by an administrator. Submitting a request does not confirm any payment.' },
  { heading: 'Disputes and contact', body: 'Outline: how disputes are raised and resolved, and the official contact channel (to be provided).' },
]

export default function Terms() {
  return <LegalPage title="Terms of use" sections={SECTIONS} />
}
