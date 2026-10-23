import { ChevronLeft, SearchX } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import AdminHeader from '../../components/admin/AdminHeader'
import ImageManager from '../../components/admin/ImageManager'
import TransitionPanel from '../../components/admin/TransitionPanel'
import Button from '../../components/ui/Button'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field'
import FormError from '../../components/ui/FormError'
import Skeleton from '../../components/ui/Skeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useSubmission } from '../../hooks/useSubmission'
import { LISTING_FIELDS, createListing, getListing, transitionListing, updateListing } from '../../services/adminService'
import { getCategories } from '../../services/livestockService'

const EMPTY = { title: '', breed: '', category: '', sex: '', ageMonths: '', weightKg: '', location: '', priceKes: '', description: '' }

function toValues(listing) {
  if (!listing) return EMPTY
  return {
    title: listing.title,
    breed: listing.breed,
    category: listing.category,
    sex: listing.sex ?? '',
    ageMonths: listing.ageMonths ?? '',
    weightKg: listing.weightKg ?? '',
    location: listing.location,
    priceKes: String(listing.priceKes),
    description: listing.description ?? '',
  }
}

const wholeNumber = (min, max, label) => ({
  validate: (v) => v === '' || (/^\d+$/.test(String(v)) && Number(v) >= min && Number(v) <= max) || `${label} must be a whole number from ${min} to ${max}`,
})

function ListingForm({ listing, categories, onSaved }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ defaultValues: toValues(listing) })
  const { onSubmit, formError } = useSubmission({
    submit: (values) => (listing ? updateListing(listing.id, values) : createListing(values)),
    fieldMap: LISTING_FIELDS,
    setError,
    onSuccess: onSaved,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 rounded-3xl border border-line/80 bg-white p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Details</h2>
      <TextField label="Title" error={errors.title?.message} {...register('title', { required: 'Enter a title', minLength: { value: 5, message: 'Use at least 5 characters' } })} />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Category" error={errors.category?.message} {...register('category', { required: 'Choose a category' })}>
          <option value="">Choose…</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Breed" error={errors.breed?.message} {...register('breed', { required: 'Enter the breed' })} />
        <SelectField label="Sex" optional error={errors.sex?.message} {...register('sex')}>
          <option value="">Not stated</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </SelectField>
        <TextField label="Location" error={errors.location?.message} {...register('location', { required: 'Enter the location' })} />
        <TextField label="Age in months" optional inputMode="numeric" error={errors.ageMonths?.message} {...register('ageMonths', wholeNumber(0, 360, 'Age'))} />
        <TextField label="Weight in kg" optional hint="Seller estimate." inputMode="numeric" error={errors.weightKg?.message} {...register('weightKg', wholeNumber(1, 3000, 'Weight'))} />
      </div>
      <TextField
        label="Price"
        prefix="KES"
        inputMode="decimal"
        error={errors.priceKes?.message}
        {...register('priceKes', {
          required: 'Enter the price',
          validate: (v) => (/^\d+(\.\d{1,2})?$/.test(String(v).trim()) && Number(v) >= 1) || 'Enter a valid price, e.g. 150000',
        })}
      />
      <TextAreaField
        label="Description"
        rows={6}
        hint="Only facts the seller has confirmed. Do not add details about the animal that are not known."
        error={errors.description?.message}
        {...register('description', { required: 'Enter a description', minLength: { value: 20, message: 'Use at least 20 characters' } })}
      />
      <FormError message={formError} />
      <Button type="submit" disabled={isSubmitting || (listing && !isDirty)}>
        {isSubmitting ? 'Saving…' : listing ? 'Save changes' : 'Create draft'}
      </Button>
    </form>
  )
}

export default function AdminListingEdit() {
  const { id } = useParams()
  const isNew = id === undefined
  const navigate = useNavigate()
  const listing = useAsync(() => (isNew ? Promise.resolve(null) : getListing(id)), `listing:${id ?? 'new'}`)
  const categories = useAsync(getCategories, 'categories')
  useDocumentTitle(isNew ? 'New listing' : (listing.data?.title ?? 'Listing'))

  const back = (
    <Link to="/admin/listings" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
      <ChevronLeft aria-hidden="true" className="size-4" />
      All listings
    </Link>
  )

  if (listing.status === 'loading' || categories.status === 'loading') return <Skeleton className="h-96 rounded-3xl" />
  if (listing.status === 'error') {
    return listing.error?.status === 404 ? (
      <EmptyState icon={SearchX} title="Listing not found" action={<Button to="/admin/listings">Back to listings</Button>} />
    ) : (
      <ErrorState title="This listing could not be loaded" message={listing.error?.message} onRetry={listing.retry} />
    )
  }
  if (categories.status === 'error') return <ErrorState title="Categories could not be loaded" onRetry={categories.retry} />

  const data = listing.data
  return (
    <>
      {back}
      <div className="mt-3">
        <AdminHeader
          title={isNew ? 'New listing' : data.title}
          description={isNew ? 'Saved as a draft. You can add photos and publish next.' : undefined}
          action={data && <StatusBadge status={data.status} className="text-sm" />}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <ListingForm
            key={data?.updatedAt ?? 'new'}
            listing={data}
            categories={categories.data}
            onSaved={(saved) => {
              toast.success(isNew ? 'Draft created. Add photos, then publish.' : 'Changes saved.')
              if (isNew) navigate(`/admin/listings/${saved.id}`, { replace: true })
              else listing.retry()
            }}
          />
          {data && <ImageManager listing={data} onChanged={listing.retry} />}
        </div>
        {data && (
          <div className="space-y-6">
            <TransitionPanel
              kind="listings"
              status={data.status}
              allowed={data.allowedTransitions}
              onSubmit={(values) => transitionListing(data.id, values)}
              onChanged={listing.retry}
            />
            {['available', 'reserved', 'sold'].includes(data.status) && (
              <Button to={`/marketplace/${data.id}`} variant="outline" className="w-full">
                View public page
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
