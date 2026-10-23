// Shared client-side validation rules. The backend repeats every check; these
// only give faster feedback.

// Safaricom/Airtel/Telkom style numbers: 07XXXXXXXX, 01XXXXXXXX, +2547..., 2541...
const KENYAN_PHONE = /^(?:\+?254|0)(?:7|1)\d{8}$/

export function normalizePhone(value) {
  return value.replace(/[\s-]/g, '')
}

export const rules = {
  fullName: {
    required: 'Enter your full name',
    minLength: { value: 3, message: 'Name must be at least 3 characters' },
    maxLength: { value: 100, message: 'Name must be 100 characters or fewer' },
  },
  phone: {
    required: 'Enter your phone number',
    validate: (v) => KENYAN_PHONE.test(normalizePhone(v)) || 'Enter a valid Kenyan phone number, e.g. 0712 345 678',
  },
  optionalEmail: {
    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
  },
  email: {
    required: 'Enter your email address',
    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
  },
  amountKes: {
    required: 'Enter an amount in KES',
    validate: (v) => {
      const n = Number(v)
      if (!Number.isFinite(n) || !/^\d+(\.\d{1,2})?$/.test(String(v).trim())) return 'Enter a valid amount, e.g. 5000'
      if (n < 1) return 'Amount must be at least KES 1'
      if (n > 10000000) return 'Amount must be KES 10,000,000 or less'
      return true
    },
  },
  notes: {
    maxLength: { value: 500, message: 'Keep this under 500 characters' },
  },
}

export function isKenyanPhone(value) {
  return KENYAN_PHONE.test(normalizePhone(value))
}
