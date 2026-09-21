# Alchmyth Charm Studio

Alchmyth Charm Studio is a full-stack storefront for handmade charms and stationery. It includes a responsive product catalog, client-side cart, server-priced Razorpay checkout, and a custom/bulk quote workflow backed by PostgreSQL.

## Technology

- TanStack Start and TanStack Router
- React 19 and TypeScript
- Vite 8 and Tailwind CSS 4
- Drizzle ORM with PostgreSQL
- Zod request validation
- Vitest and Playwright
- Bun for package management and scripts

## Features

### Storefront

- Home, catalog, product, contact, and thank-you pages
- Responsive search, navigation, and cart drawer
- Product quantities and cart totals
- Bag-charm custom/bulk pricing calculator
- Mobile and desktop layouts

### Quote workflow

Quote prices are always recomputed on the server from product and option selections.

1. `POST /api/quotes` creates a canonical quote with a unique `ALC-######` reference.
2. The quote is stored in PostgreSQL with its pricing snapshot and a seven-day validity period.
3. `POST /api/quotes/:quoteId/submit` validates customer details, applies rate limiting, and claims the submission idempotently.
4. The server builds a self-contained invoice document and sends the canonical payload to the configured n8n webhook.
5. Delivery failures are persisted so the customer can retry.
6. `POST /api/quotes/:quoteId/status` accepts authenticated workflow updates when a callback secret is configured.

Public quote responses omit customer details and internal errors. The webhook test route is disabled in production; the invoice-preview route uses static sample data and never reads customer records.

### Razorpay checkout

The browser sends product slugs and quantities, never prices. The server resolves the current catalog prices and stores an immutable order snapshot in paise.

1. A pending order is persisted before the Razorpay order is created.
2. Razorpay order IDs, payment IDs, and internal 128-bit references are unique.
3. Browser verification validates the Razorpay HMAC signature.
4. The server fetches the provider payment and order and verifies identity, amount, currency, paid order status, and captured payment status.
5. Signed Razorpay webhooks use the same settlement path as browser verification.
6. Duplicate callbacks with the same payment are idempotent; conflicting payment associations fail.
7. The thank-you page shows success only after loading a paid order from the server.

## Routes

Customer pages:

- `/`
- `/category/all-products`
- `/product/:slug`
- `/contact`
- `/thank-you`

Server endpoints are under `/api/quotes`, `/api/razorpay`, and `/api/orders`.

## Local setup

### Requirements

- Bun 1.3 or later
- PostgreSQL
- Chromium for Playwright browser tests

Install dependencies:

```sh
bun install
```

Copy the names-only environment template and supply local values through your environment or secret manager:

```sh
cp .env.example .env
```

Apply the committed database migrations to an empty or migration-managed development database:

```sh
bunx drizzle-kit migrate
```

Start the development server:

```sh
bun run dev --host 0.0.0.0 --port 5000
```

## Environment variables

Never commit environment values. Variables used by this project are listed in `.env.example`.

### Required for persisted application flows

- `DATABASE_URL` — PostgreSQL connection used by Drizzle and the server.

### Required for Razorpay checkout

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

### Recommended for Razorpay webhooks

- `RAZORPAY_WEBHOOK_SECRET` — dedicated HMAC secret configured for the Razorpay webhook. If absent, the server currently falls back to `RAZORPAY_KEY_SECRET`.

### Quote delivery and callbacks

- `N8N_WEBHOOK_URL` — quote submission webhook. The application has a development/demo default, but deployments should set it explicitly.
- `N8N_WEBHOOK_SECRET` — optional secret sent to n8n in the webhook header.
- `QUOTE_CALLBACK_SECRET` — optional secret required from n8n for status callbacks.
- `PUBLIC_BASE_URL` — public application origin used to build callback URLs; required in production.
- `TAX_MODE` — optional: `none`, `inclusive`, or `exclusive`; defaults to `none`.
- `GST_RATE` — optional percentage from 0 to 100; defaults to `0`.

### Platform and test variables

- `REPLIT_DEV_DOMAIN` — Replit development-domain fallback for non-production quote callbacks.
- `PLAYWRIGHT_CHROMIUM_PATH` — optional Chromium executable override for Playwright.
- `NODE_ENV` — set by the runtime and used to disable development behavior in production.

## Database

The schema is defined in `drizzle/schema.ts`.

- `quotes` stores canonical quote payloads, customer submission data, delivery state, and idempotency claims.
- `quote_submit_limits` stores submission rate-limit windows.
- `orders` stores immutable server-priced carts and pending/paid Razorpay state.

Committed migrations and Drizzle metadata live in `drizzle/migrations/`.

When changing the schema:

1. Edit `drizzle/schema.ts`.
2. Generate a migration with `bunx drizzle-kit generate`.
3. Inspect the SQL and generated metadata.
4. Apply it to the development database with `bunx drizzle-kit migrate`.
5. Commit the schema, SQL migration, and migration metadata together.

Do not edit an already-deployed migration. Add a new migration instead.

## Validation

```sh
bun run lint
bunx tsc --noEmit
bun run test
bun run test:e2e
bun run build
```

`bun run format` modifies files; use it intentionally rather than as a read-only check.

The Playwright suite starts a temporary server on port 4173. On Replit, check that the test run did not leave a temporary 4173 port entry in `.replit`.

## Deployment

The Replit deployment is configured as an Autoscale application:

- Build: `bun run build`
- Start: `./node_modules/.bin/node .output/server/index.mjs`

Before publishing:

1. Configure production secrets and environment variables, including the production `DATABASE_URL`, Razorpay credentials, and `PUBLIC_BASE_URL`.
2. Configure Razorpay to send signed events to `/api/razorpay/webhook` with the same webhook secret used by the application.
3. Apply the committed migrations to the production database.
4. Run the validation commands above.
5. Publish through Replit and verify quote submission, callback delivery, and payment confirmation in the target environment.

Do not place secrets in `.replit`, source files, browser-prefixed variables, or committed environment files.
