// Expected values from backend/livestock/sample_data/sample_data.json, which
// e2e/support/start-backend.sh loads into a fresh database for every run.
// If the sample data changes, update these to match.

export const TOTAL_LISTINGS = 14
export const PAGE_SIZE = 9

/** Every sample listing title, newest published first (the default sort). */
export const TITLES_NEWEST_FIRST = [
  'Boran breeding bull',
  'In-calf Friesian heifer',
  'Boran steer for finishing',
  'Ayrshire cow, second lactation',
  'Friesian heifer calf',
  'Jersey heifer, ready for service',
  'Jersey-Friesian cross heifer calf',
  'Sahiwal-cross steer',
  'Friesian bull',
  'Guernsey dairy cow',
  'Simmental-cross steer',
  'Sahiwal bull',
  'Ankole cow',
  'Ayrshire bull calf',
]

/** Homepage "Featured livestock": the four newest available listings. */
export const FEATURED_TITLES = TITLES_NEWEST_FIRST.slice(0, 4)

export const CATEGORY_NAMES = ['Dairy', 'Beef', 'Bulls', 'Calves']

export const BULLS_BY_PRICE_DESC = ['Boran breeding bull', 'Friesian bull', 'Sahiwal bull']

/** Exact breed "Friesian" (the cross-breed is a different breed value). */
export const FRIESIAN_BREED_TITLES = ['In-calf Friesian heifer', 'Friesian heifer calf', 'Friesian bull']

/** Keyword search matches title, breed, location and description. */
export const KIAMBU_TITLES = ['Jersey heifer, ready for service', 'Jersey-Friesian cross heifer calf']

/** Prices from KES 90,000 to KES 100,000 inclusive, newest first. */
export const PRICE_90K_TO_100K_TITLES = ['Jersey heifer, ready for service', 'Sahiwal-cross steer', 'Ankole cow']

export const LISTINGS = {
  friesianBull: {
    title: 'Friesian bull',
    price: 'KES 210,000',
    facts: [
      ['Breed', 'Friesian'],
      ['Category', 'Bulls'],
      ['Sex', 'Male'],
      ['Age', '3 years'],
      ['Weight', '590 kg (seller estimate)'],
      ['Location', 'Eldoret, Uasin Gishu'],
      ['Listed', '11 Oct 2026'],
    ],
    imageCount: 2,
    relatedHeading: 'Similar bulls listings',
    relatedTitles: ['Boran breeding bull', 'Sahiwal bull'],
  },
  // No age or weight in the data: those facts must not be shown at all.
  sahiwalBull: {
    title: 'Sahiwal bull',
    factLabels: ['Breed', 'Category', 'Sex', 'Location', 'Listed'],
  },
  soldCalf: { title: 'Ayrshire bull calf' },
  reservedCow: { title: 'Guernsey dairy cow' },
} as const
