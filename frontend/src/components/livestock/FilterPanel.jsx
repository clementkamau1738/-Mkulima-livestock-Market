import { useState } from 'react'
import { useSyncedDraft } from '../../hooks/useSyncedDraft'
import Button from '../ui/Button'
import { SelectField, TextField } from '../ui/Field'

function PriceRange({ minPrice, maxPrice, onApply }) {
  const [min, setMin] = useSyncedDraft(minPrice)
  const [max, setMax] = useSyncedDraft(maxPrice)
  const [error, setError] = useState(null)

  function submit(e) {
    e.preventDefault()
    const lo = min === '' ? null : Number(min)
    const hi = max === '' ? null : Number(max)
    if ((lo != null && (!Number.isFinite(lo) || lo < 0)) || (hi != null && (!Number.isFinite(hi) || hi < 0))) {
      setError('Prices must be positive numbers')
      return
    }
    if (lo != null && hi != null && lo > hi) {
      setError('Minimum price cannot be more than the maximum')
      return
    }
    setError(null)
    onApply({ minPrice: lo == null ? '' : String(Math.floor(lo)), maxPrice: hi == null ? '' : String(Math.floor(hi)) })
  }

  return (
    <form onSubmit={submit} noValidate>
      <fieldset className="space-y-3">
        <legend className="mb-3 block text-sm font-semibold text-ink">Price range (KES)</legend>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Min" type="number" inputMode="numeric" min="0" step="1000" placeholder="0" value={min} onChange={(e) => setMin(e.target.value)} />
          <TextField label="Max" type="number" inputMode="numeric" min="0" step="1000" placeholder="Any" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="outline" size="sm" className="w-full">
          Apply price
        </Button>
      </fieldset>
    </form>
  )
}

export default function FilterPanel({ filters, categories, breeds, onChange, onReset, canReset }) {
  return (
    <div className="space-y-6">
      <SelectField label="Category" value={filters.category} onChange={(e) => onChange({ category: e.target.value })}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Breed" value={filters.breed} onChange={(e) => onChange({ breed: e.target.value })}>
        <option value="">All breeds</option>
        {breeds.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </SelectField>
      <PriceRange minPrice={filters.minPrice} maxPrice={filters.maxPrice} onApply={onChange} />
      {canReset && (
        <Button variant="ghost" size="sm" className="w-full" onClick={onReset}>
          Clear all filters
        </Button>
      )}
    </div>
  )
}
