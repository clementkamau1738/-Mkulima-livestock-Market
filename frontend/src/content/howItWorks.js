import { CalendarCheck, ClipboardCheck, FileSearch, MessageSquare, Search } from 'lucide-react'

export const STEPS = [
  {
    icon: Search,
    title: 'Browse',
    short: 'Search the marketplace by breed, category, location and price.',
    detail:
      'Use the marketplace to search by keyword and filter by category, breed and price range. Listings show the details a seller has provided, and nothing more.',
  },
  {
    icon: FileSearch,
    title: 'Review details',
    short: 'Compare photos, age, location and the seller’s description.',
    detail:
      'Open a listing to see its gallery, breed, sex, age, location, price and description. If a detail you need is missing, ask about it in your inquiry rather than assuming.',
  },
  {
    icon: MessageSquare,
    title: 'Send an inquiry',
    short: 'Tell us which animal you want and how to reach you.',
    detail:
      'Submit a purchase inquiry from the listing page. You receive a reference number and the inquiry starts as pending. An inquiry is not a purchase or a reservation.',
  },
  {
    icon: CalendarCheck,
    title: 'Verify or view',
    short: 'We help arrange a viewing or independent verification.',
    detail:
      'Our team contacts you to arrange a viewing or a check by your own veterinarian. Seller contact details are shared only at this stage, and only with buyers who have inquired.',
  },
  {
    icon: ClipboardCheck,
    title: 'Confirm payment',
    short: 'Pay only through an authorised, verified process.',
    detail:
      'When you agree to buy, pay only through the official payment details shown on the Deposit page. Payment is confirmed only after an administrator verifies it independently.',
  },
]
