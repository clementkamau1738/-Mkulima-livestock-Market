// Test fixture: placeholder deposit instructions as the API returns them by default.

export const mockPaymentInstructions = {
  isPlaceholder: true,
  title: 'How to pay a deposit',
  steps: [
    'Send the deposit using the official payment method listed below.',
    'Keep the confirmation message or receipt you receive from your provider.',
    'Submit this form with the exact payment reference from that confirmation.',
    'An administrator checks the payment independently before approving your request.',
  ],
  methods: [
    { label: 'M-Pesa Paybill number', value: '[To be provided by administrator]' },
    { label: 'Account number', value: '[To be provided by administrator]' },
    { label: 'Bank transfer details', value: '[To be provided by administrator]' },
  ],
  note: 'Only pay using details published here by the Mkulima team. We will never ask you to send money to a personal number.',
}
