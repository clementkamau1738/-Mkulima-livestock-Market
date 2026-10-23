# Mkulima-Livestock-Market: Shared Context

## Role

Act as a senior full-stack engineer, UI/UX designer, Django backend architect, database designer, and QA engineer. Build **Mkulima-Livestock-Market**, a complete, responsive livestock marketplace for customers in Kenya.

Work directly in the project files. Do not only output snippets or explanations. Implement, run, test, fix, and document. If the directory is empty, initialize it. If files exist, inspect them before modifying anything and never overwrite user files blindly.

## Working rules

- Build in five phases, in order. Finish and verify each phase before starting the next. Never attempt everything in one pass.
- Never claim a test, build, server, database connection, or deployment succeeded unless you actually ran it and saw the result.
- Never silently skip failing tests. Fix them or document the blocker.
- If a tool, database, credential, or service is unavailable, implement what can be done safely, state the blocker, and give exact steps to resolve it.
- Do not leave core features as TODOs or non-functional placeholders. Clearly label anything that needs external credentials or real business information.
- Do not add dependencies or change the stack without a clear technical reason. Pin stable, compatible versions and record them in the README.

## Product overview

Customers can browse livestock, inspect listings, submit purchase inquiries, and submit deposit and withdrawal **requests**. Administrators manage listings and review all requests.

Core features: public homepage; livestock marketplace with search, filters, sorting and pagination; livestock detail pages with galleries; purchase inquiries; deposit request form; withdrawal request form; customer registration, login and request tracking; administrator authentication; listing, inquiry, deposit and withdrawal management; role-based access control; responsive design; validation, error handling, loading states and notifications; automated tests and deployment documentation.

## Fixed technology stack (do not change)

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, React Hook Form (where useful), a lightweight toast library, Lucide React.
- **Backend:** Python, Django, Django REST Framework, a services layer for business logic, Django auth and permissions, migrations, Django Admin for initial administration.
- **Data:** PostgreSQL via the Django ORM. Local media storage in development, configurable object storage in production.
- **Tooling:** Git, environment variables, `.env.example`, automated frontend and backend tests, Docker and Docker Compose where practical.

## Required project structure (do not change; add supporting files as needed)

```
Mkulima-Livestock-Market/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Marketplace.jsx
│   │   │   ├── LivestockDetails.jsx
│   │   │   ├── Deposit.jsx
│   │   │   └── Withdrawal.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── context/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── config/
│   ├── accounts/
│   ├── livestock/
│   ├── inquiries/
│   ├── payments/
│   ├── transactions/
│   ├── requirements.txt
│   └── manage.py
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

Add further pages as needed (registration, login, customer dashboard, request history, admin interfaces).

## Design requirements

Polished, production-quality agricultural marketplace, not a generic template.

- Primary forest green `#153D2C`, accent lime `#D9F36A`, cream background `#F7F3E9`, white `#FFFFFF`, dark text with accessible contrast.
- Soft borders, rounded cards, restrained shadows, generous spacing, modern typography, clear hierarchy.
- Use original code and only assets we have permission to use (local sample assets or properly licensed photos). No unreliable hotlinked images. Do not reuse one image for every listing.
- If a reference website is provided, match its general style and interactions only. Do not copy its code, text, or assets. If none is provided, follow the visual direction above.

**Navbar:** wordmark, Home, Marketplace, How It Works, Deposit, Withdraw, Login or account menu, and a prominent **Browse Livestock** button. Accessible mobile menu.

**Homepage:** hero (headline, supporting text, livestock photo, marketplace CTA); search bar; featured livestock; categories (Dairy, Beef, Bulls, Calves; designed so other livestock types can be added later); How It Works; trust and responsible-trading information; closing CTA; footer with navigation, contact details and policy links.

**Marketplace:** responsive grid showing photo, title, breed, category, age (if available), location, price in KES, availability badge, View Details. Keyword search; breed, category and price-range filters; sort by price and newest; pagination; loading skeletons; empty and error states. Sync filters to URL query parameters.

**Livestock details:** image gallery, title, breed, sex, age, category, price in KES, location, description, availability, seller or farm contact **only when authorized**, Purchase Inquiry button, related listings. Never show fields missing from the data and never invent details about an animal.

**Deposit page:** administrator-configurable payment instructions (placeholders until real details exist); name, phone, amount in KES, payment reference, optional notes; validation; confirmation with request reference number; status (pending, approved, rejected). Never imply money has been received because a form was submitted.

**Withdrawal page:** customer info, amount in KES, authorized destination details, reason or notes, validation, confirmation, reference number, status. Show an available balance **only** if a real wallet and ledger exist. Otherwise show no balance and do not suggest unverified funds can be withdrawn.

**How It Works:** browse, review details, submit inquiry, arrange verification or viewing, confirm payment through an authorized process. Explain deposits and withdrawals separately and state which operations need administrator review.

**Do not invent** real credentials, testimonials, certifications, contact details, or guarantees. Use clearly marked placeholders.

## Financial and security rules (mandatory in every phase)

- Submitting a deposit or withdrawal form never means money moved. Requests stay **pending** until independently verified and reviewed.
- Never hardcode secrets, payment credentials, or database passwords.
- Never fabricate payment confirmations, balances, transactions, or business credentials.
- Never treat a submitted reference number as verified payment.
- Customers can never approve their own requests. The frontend never decides balances, prices, user IDs, or approval status.
- Wallet and WalletLedgerEntry are **not** implemented unless the business requires stored balances. If added later: atomic transactions, row locking, a ledger, balance constraints, and idempotency, so retries and duplicate callbacks cannot credit or debit twice.
- Validate and authorize every financial operation on the backend. Rate-limit sensitive endpoints. Use Django password validation.
- Keep provider-specific payment code (future M-Pesa) separate from core request and transaction logic. Do not integrate real payments until credentials are supplied.
- Protect private customer data. Error messages must not leak server internals.

## Coding standards

Readable, maintainable code; reusable React components; API calls only in service modules; Django views, serializers, models, permissions and services kept separate; no duplicated logic; meaningful names; database constraints and indexes; tests for critical business rules; no unnecessary abstractions or dependencies.

## Environment and documentation

Maintain `.env.example` (root and `frontend/`) with placeholders only. Document: Django secret key, debug mode, allowed hosts, database name/user/password/host/port, `VITE_API_BASE_URL`, CORS and CSRF trusted origins, media storage, and payment-provider settings (when added). Keep `README.md` current with overview, architecture, prerequisites, install, environment and PostgreSQL setup, migrations, dev and test commands, sample data, admin account setup, API docs, deployment, and troubleshooting. Never put real secrets in the README.

## End-of-phase report (required every time)

Features completed · Files created or changed · Commands executed · Tests and builds run · Results (actual output) · Known issues · Exact next step. Then **stop and wait** for my go-ahead before the next phase.
