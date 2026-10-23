import { formatKes } from '../../utils/format'

export const REQUEST_KINDS = {
  inquiries: {
    title: 'Purchase inquiries',
    description: 'Follow up buyers from first contact to completed sale.',
    detail: (row) => row.listing?.title,
    detailHeader: 'Listing',
  },
  deposits: {
    title: 'Deposit requests',
    description: 'Approve only after finding the payment in the official statement.',
    detail: (row) => `${formatKes(row.amountKes)} · ${row.paymentReference}`,
    detailHeader: 'Amount and reference',
  },
  withdrawals: {
    title: 'Withdrawal requests',
    description: 'Approve, send the payout, then confirm it with the provider reference.',
    detail: (row) => `${formatKes(row.amountKes)} · ${row.destination}`,
    detailHeader: 'Amount and destination',
  },
}
