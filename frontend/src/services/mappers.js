// Converts API (snake_case) payloads into the shapes the UI components use,
// and form values into API payloads. Optional fields stay null when absent so
// components can hide them.

function mapImage(image, fallbackAlt) {
  return {
    id: image.id,
    src: image.url,
    alt: image.alt_text || image.caption || fallbackAlt,
    altText: image.alt_text ?? '',
    caption: image.caption ?? '',
    isPrimary: image.is_primary,
  }
}

export function mapListing(data) {
  const images = data.images ?? (data.primary_image ? [data.primary_image] : [])
  return {
    id: String(data.id),
    slug: data.slug,
    title: data.title,
    breed: data.breed,
    category: data.category?.slug ?? '',
    categoryName: data.category?.name ?? '',
    sex: data.sex || null,
    ageMonths: data.age_months ?? null,
    weightKg: data.weight_kg ?? null,
    location: data.location,
    priceKes: Number(data.price_kes),
    status: data.status,
    publishedAt: data.published_at,
    description: data.description ?? null,
    images: images.map((image) => mapImage(image, `Photo of ${data.title}`)),
  }
}

export function mapPage(data, mapItem) {
  return {
    count: data.count,
    page: data.page,
    totalPages: data.total_pages,
    results: data.results.map(mapItem),
  }
}

export function mapReceipt(data) {
  return {
    reference: data.reference,
    status: data.status,
    submittedAt: data.created_at,
    isSample: false,
  }
}

export function mapPaymentInstructions(data) {
  return {
    isPlaceholder: data.is_placeholder,
    title: data.title,
    steps: data.steps,
    methods: data.methods,
    note: data.note,
  }
}

// Renames API field errors to form field names, e.g. {payment_reference: [...]}
// -> {paymentReference: "..."}. Unknown fields are returned separately.
export function mapFieldErrors(fields, fieldMap) {
  const known = {}
  const other = []
  for (const [apiName, messages] of Object.entries(fields ?? {})) {
    const message = Array.isArray(messages) ? messages[0] : String(messages)
    if (fieldMap[apiName]) known[fieldMap[apiName]] = message
    else other.push(message)
  }
  return { known, other }
}

export function mapUser(data) {
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    phone: data.phone,
    role: data.role,
    isReviewer: data.is_reviewer,
    joinedAt: data.date_joined,
  }
}

function mapPerson(data) {
  return data ? { id: data.id, email: data.email, fullName: data.full_name || data.email } : null
}

function mapHistory(entries = []) {
  return entries.map((h) => ({
    from: h.from_status || null,
    to: h.to_status,
    reason: h.reason ?? '',
    at: h.created_at,
    by: mapPerson(h.changed_by),
  }))
}

// Customer's own inquiries, deposits and withdrawals for the dashboard.
export function mapCustomerRequest(kind, data) {
  return {
    kind,
    reference: data.reference,
    status: data.status,
    createdAt: data.created_at,
    amountKes: data.amount != null ? Number(data.amount) : null,
    listing: data.listing ? { id: String(data.listing.id), title: data.listing.title } : null,
    paymentReference: data.payment_reference ?? null,
    destination: data.destination ?? null,
    reviewNote: data.review_note || null,
    history: mapHistory(data.history),
  }
}

// Staff view of a request: everything the reviewer needs, plus the next
// statuses the server allows. The UI offers only those.
export function mapAdminRequest(kind, data) {
  return {
    ...mapCustomerRequest(kind, data),
    fullName: data.full_name,
    phone: data.phone,
    email: data.email || null,
    message: data.message ?? null,
    notes: data.notes || null,
    reason: kind === 'withdrawals' ? data.reason || null : null,
    method: data.method ?? null,
    payout:
      kind === 'withdrawals' && 'mpesa_number' in data
        ? { mpesaNumber: data.mpesa_number, bankName: data.bank_name, accountName: data.account_name, accountNumber: data.account_number }
        : null,
    customer: mapPerson(data.user),
    reviewer: mapPerson(data.reviewer),
    reviewedAt: data.reviewed_at ?? null,
    updatedAt: data.updated_at,
    transaction: data.transaction
      ? { reference: data.transaction.reference, externalReference: data.transaction.external_reference, occurredAt: data.transaction.occurred_at }
      : null,
    allowedTransitions: data.allowed_transitions ?? [],
  }
}

export function mapAdminListing(data) {
  return {
    ...mapListing(data),
    allowedTransitions: data.allowed_transitions ?? [],
    imageCount: data.image_count ?? 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export function mapAccount(data) {
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    phone: data.phone,
    role: data.role,
    isActive: data.is_active,
    joinedAt: data.date_joined,
    lastLogin: data.last_login,
    canChangeAccess: data.can_change_access ?? false,
  }
}

export function mapAuditEntry(data) {
  return {
    id: data.id,
    at: data.created_at,
    actor: mapPerson(data.actor),
    action: data.action,
    target: `${data.target_type}:${data.target_id}`,
    summary: data.summary,
    changes: data.changes,
    ipAddress: data.ip_address,
  }
}
