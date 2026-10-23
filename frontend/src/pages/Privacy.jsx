import LegalPage from './LegalPage'

const SECTIONS = [
  { heading: 'What we collect', body: 'Outline: contact details you submit with inquiries and requests, account information, and payment references you provide.' },
  { heading: 'How it is used', body: 'Outline: to review requests, arrange viewings, verify payments and contact you. Seller contact details are shared only with reviewed buyers.' },
  { heading: 'Your rights', body: 'Outline: access, correction and deletion rights under the Kenya Data Protection Act, 2019, and how to exercise them.' },
  { heading: 'Contact', body: 'Outline: the data protection contact for Mkulima Livestock Market (to be provided).' },
]

export default function Privacy() {
  return <LegalPage title="Privacy policy" sections={SECTIONS} />
}
