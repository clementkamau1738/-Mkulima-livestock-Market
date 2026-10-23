import { useState } from 'react'

export default function Gallery({ images }) {
  const [active, setActive] = useState(0)
  if (!images?.length) return null
  const current = images[active] ?? images[0]

  return (
    <div>
      <figure>
        <div className="overflow-hidden rounded-3xl border border-line/80 bg-cream-200">
          <img src={current.src} alt={current.alt} className="aspect-[4/3] w-full object-cover" />
        </div>
        {current.caption && <figcaption className="mt-2 text-xs text-ink-muted">{current.caption}</figcaption>}
      </figure>
      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-3" aria-label="Choose image">
          {images.map((image, index) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-pressed={index === active}
                className={`block w-full overflow-hidden rounded-2xl border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${
                  index === active ? 'border-forest' : 'border-transparent opacity-75 hover:opacity-100'
                }`}
              >
                <img src={image.src} alt="" className="aspect-[4/3] w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
