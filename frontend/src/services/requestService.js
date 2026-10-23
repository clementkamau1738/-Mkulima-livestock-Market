import api from './api'
import { mapPaymentInstructions, mapReceipt } from './mappers'

// Each submit takes an idempotency key that the caller keeps for every retry
// of the same submission, so a retried request can never create a second record.
function post(url, payload, idempotencyKey) {
  return api.post(url, payload, { headers: { 'Idempotency-Key': idempotencyKey } })
}

// `listing` errors (e.g. listing just sold) have no input; they show as a form-level message.
export const INQUIRY_FIELDS = { full_name: 'fullName', phone: 'phone', email: 'email', message: 'message' }

export async function submitInquiry(values, idempotencyKey) {
  const { data } = await post(
    '/inquiries/',
    { listing: Number(values.listingId), full_name: values.fullName, phone: values.phone, email: values.email, message: values.message },
    idempotencyKey,
  )
  return mapReceipt(data)
}

export const DEPOSIT_FIELDS = {
  full_name: 'fullName',
  phone: 'phone',
  amount: 'amount',
  payment_reference: 'paymentReference',
  notes: 'notes',
}

export async function submitDeposit(values, idempotencyKey) {
  const { data } = await post(
    '/deposits/',
    {
      full_name: values.fullName,
      phone: values.phone,
      amount: values.amount,
      payment_reference: values.paymentReference,
      notes: values.notes,
    },
    idempotencyKey,
  )
  return mapReceipt(data)
}

export const WITHDRAWAL_FIELDS = {
  full_name: 'fullName',
  phone: 'phone',
  amount: 'amount',
  method: 'method',
  mpesa_number: 'mpesaNumber',
  bank_name: 'bankName',
  account_name: 'accountName',
  account_number: 'accountNumber',
  reason: 'reason',
}

export async function submitWithdrawal(values, idempotencyKey) {
  const bank = values.method === 'bank'
  const { data } = await post(
    '/withdrawals/',
    {
      full_name: values.fullName,
      phone: values.phone,
      amount: values.amount,
      method: values.method,
      mpesa_number: bank ? '' : values.mpesaNumber,
      bank_name: bank ? values.bankName : '',
      account_name: bank ? values.accountName : '',
      account_number: bank ? values.accountNumber : '',
      reason: values.reason,
    },
    idempotencyKey,
  )
  return mapReceipt(data)
}

export async function getPaymentInstructions() {
  const { data } = await api.get('/payment-instructions/')
  return mapPaymentInstructions(data)
}
