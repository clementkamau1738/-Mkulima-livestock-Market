// Categories are data, not code: add a new livestock type (e.g. goats) by adding
// an entry here now, and as a database record once the API exists.
export const mockCategories = [
  {
    slug: 'dairy',
    name: 'Dairy',
    description: 'Cows and heifers kept for milk production.',
    image: '/images/site/category-dairy.svg',
  },
  {
    slug: 'beef',
    name: 'Beef',
    description: 'Steers and cows raised for meat and finishing.',
    image: '/images/site/category-beef.svg',
  },
  {
    slug: 'bulls',
    name: 'Bulls',
    description: 'Mature bulls for breeding and herd improvement.',
    image: '/images/site/category-bulls.svg',
  },
  {
    slug: 'calves',
    name: 'Calves',
    description: 'Weaned heifer and bull calves to raise on.',
    image: '/images/site/category-calves.svg',
  },
]
