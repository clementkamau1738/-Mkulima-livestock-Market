// How each status change is presented to staff. Which changes are possible is
// decided by the server (allowed_transitions); this only supplies wording and
// which extra inputs to collect. The server re-checks all of it.
export const TRANSITION_UI = {
  deposits: {
    approved: {
      label: 'Approve deposit',
      confirm: 'I found this payment in the official M-Pesa or bank statement, and the reference and amount match.',
    },
    rejected: { label: 'Reject', danger: true, reason: 'required' },
  },
  withdrawals: {
    approved: { label: 'Approve payout', confirm: 'I verified that this customer is owed this amount.' },
    rejected: { label: 'Reject', danger: true, reason: 'required' },
    processing: { label: 'Mark as processing' },
    completed: {
      label: 'Mark payout completed',
      confirm: 'The payout was sent and appears in the official statement.',
      externalReference: true,
    },
    failed: { label: 'Mark payout failed', danger: true, reason: 'required' },
  },
  inquiries: {
    contacted: { label: 'Mark as contacted' },
    viewing_arranged: { label: 'Viewing arranged' },
    completed: { label: 'Mark completed' },
    cancelled: { label: 'Cancel inquiry', danger: true, reason: 'required' },
  },
  listings: {
    available: { label: 'Publish', labelFrom: { reserved: 'Make available again' } },
    reserved: { label: 'Mark reserved' },
    sold: { label: 'Mark sold' },
    archived: { label: 'Archive', danger: true },
    draft: { label: 'Restore to draft' },
  },
}

export const STATUS_FILTERS = {
  inquiries: ['pending', 'contacted', 'viewing_arranged', 'completed', 'cancelled'],
  deposits: ['pending', 'approved', 'rejected'],
  withdrawals: ['pending', 'approved', 'processing', 'completed', 'rejected', 'failed'],
  listings: ['draft', 'available', 'reserved', 'sold', 'archived'],
}

export function transitionLabel(kind, from, to) {
  const ui = TRANSITION_UI[kind]?.[to]
  return ui?.labelFrom?.[from] ?? ui?.label ?? to
}
