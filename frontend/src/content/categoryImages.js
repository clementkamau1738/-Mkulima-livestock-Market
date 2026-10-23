// Photos for the homepage category cards (credited on /photo-credits). Categories come from the API;
// a new category without artwork falls back to the generic image.
const IMAGES = {
  dairy: '/images/site/category-dairy.webp',
  beef: '/images/site/category-beef.webp',
  bulls: '/images/site/category-bulls.webp',
  calves: '/images/site/category-calves.webp',
}

export function categoryImage(slug) {
  return IMAGES[slug] ?? '/images/site/hero-herd.webp'
}
