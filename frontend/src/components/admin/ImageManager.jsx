import { ImagePlus, Star, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { deleteImage, updateImage, uploadImage } from '../../services/adminService'
import { ALLOWED_IMAGE_TYPES, checkImageFile } from '../../utils/imageFile'
import Button from '../ui/Button'
import FormError from '../ui/FormError'


function errorText(error) {
  return error.fields?.image?.[0] ?? error.message
}

function Photo({ listingId, image, onChanged }) {
  const [alt, setAlt] = useState(image.altText)
  const [busy, setBusy] = useState(false)

  async function run(action, success) {
    if (busy) return
    setBusy(true)
    try {
      await action()
      toast.success(success)
      await onChanged()
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-line/80 bg-white">
      <div className="relative">
        <img src={image.src} alt={image.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
        {image.isPrimary && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-xs font-semibold text-forest">
            <Star aria-hidden="true" className="size-3.5" />
            Main photo
          </span>
        )}
      </div>
      <div className="space-y-3 p-3">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-ink">Description for screen readers</span>
          <input
            value={alt}
            maxLength={200}
            onChange={(e) => setAlt(e.target.value)}
            className="block w-full rounded-lg border border-line px-2.5 py-1.5 text-sm focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {alt !== image.altText && (
            <Button size="sm" disabled={busy} onClick={() => run(() => updateImage(listingId, image.id, { altText: alt }), 'Description saved.')}>
              Save
            </Button>
          )}
          {!image.isPrimary && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => updateImage(listingId, image.id, { isPrimary: true }), 'Main photo changed.')}>
              Make main photo
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            aria-label={`Remove photo: ${image.alt}`}
            onClick={() => window.confirm('Remove this photo? This cannot be undone.') && run(() => deleteImage(listingId, image.id), 'Photo removed.')}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  )
}

export default function ImageManager({ listing, onChanged }) {
  const fileRef = useRef(null)
  const [alt, setAlt] = useState('')
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)

  async function upload(event) {
    event.preventDefault()
    if (uploading) return
    const file = fileRef.current?.files?.[0]
    const problem = checkImageFile(file)
    setError(problem)
    if (problem) return
    setUploading(true)
    try {
      await uploadImage(listing.id, file, alt.trim())
      toast.success('Photo uploaded.')
      fileRef.current.value = ''
      setAlt('')
      await onChanged()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <section aria-labelledby="photos" className="rounded-3xl border border-line/80 bg-white p-6">
      <h2 id="photos" className="font-display text-lg font-semibold text-ink">
        Photos
      </h2>
      <p className="mt-1 text-sm text-ink-muted">JPEG, PNG or WebP, up to 5 MB, at least 400 pixels on each side. Use only photos you have permission to publish.</p>
      {listing.images.length > 0 ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {listing.images.map((image) => (
            <Photo key={image.id} listingId={listing.id} image={image} onChanged={onChanged} />
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-muted">No photos yet. A listing needs at least one photo before it can be published.</p>
      )}
      <form onSubmit={upload} noValidate className="mt-6 space-y-4 rounded-2xl border border-dashed border-line p-4">
        <label className="block space-y-1.5">
          <span className="block text-sm font-semibold text-ink">Photo file</span>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            onChange={() => setError(null)}
            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-forest file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cream"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-sm font-semibold text-ink">
            Description <span className="font-normal text-ink-muted">(optional, for screen readers)</span>
          </span>
          <input
            value={alt}
            maxLength={200}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="e.g. Friesian heifer standing in a paddock, side view"
            className="block w-full rounded-xl border border-line bg-white px-3.5 py-2.5 focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none"
          />
        </label>
        <FormError message={error} />
        <Button type="submit" variant="outline" disabled={uploading}>
          <ImagePlus aria-hidden="true" className="size-4" />
          {uploading ? 'Uploading…' : 'Upload photo'}
        </Button>
      </form>
    </section>
  )
}
