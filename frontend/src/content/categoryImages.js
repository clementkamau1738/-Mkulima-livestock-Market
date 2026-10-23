// Illustrations for the homepage category cards. Categories come from the API;
// a new category without artwork falls back to the generic image.
const IMAGES = {
  dairy: '/images/site/category-dairy.svg',
  beef: '/images/site/category-beef.svg',
  bulls: '/images/site/category-bulls.svg',
  calves: '/images/site/category-calves.svg',
}

export function categoryImage(slug) {
  return IMAGES[slug] ?? '/images/site/hero-herd.svg'
}
