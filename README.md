# Quay — sell digital downloads. Get paid. Deliver instantly.

Quay (pronounced “key”) is a SendOwl-style storefront for digital products:
a marketing homepage, a shoppable store, checkout with discount codes and
order bumps, HMAC-signed expiring download links, an affiliate/referral
program, order receipt emails, and a full seller dashboard (analytics,
orders, products, discounts, affiliates, settings).

**Tech:** Next.js 14 App Router + TypeScript, plain hand-written CSS
(no Tailwind). Product art is pure CSS/SVG — no external images.
Optional integrations are **pluggable**: Postgres (`pg`), Resend emails,
and real password auth all activate when their env var is set — everything
degrades gracefully to zero-setup defaults when absent.

**What's new:** real admin auth (bcrypt + HMAC sessions, demo fallback),
pluggable Postgres adapter, Resend receipt emails, affiliate system
(`/r/<code>` links, referral cookie, commission tracking), SEO
(sitemap + robots + per-product OG metadata), CSV order export.

---

## Run locally

```bash
npm install
npm run dev        # → http://localhost:3000
```

The seed script runs automatically before `next build` (and can be run
manually with `npm run seed`). It is idempotent — it only creates
`data/*.json` and `public/samples/*` files that don't exist yet.

- **Shop:** `/shop` · **Checkout:** `/checkout` (demo mode, no real charges)
- **Dashboard:** `/dashboard` — password login when `ADMIN_PASSWORD_HASH` is
  set, otherwise the old any-email demo gate (`/dashboard/login`) with a
  visible "demo auth" sticker
- **Sample download link:** complete a demo checkout to get real `/d/<token>` links

> npm cache note: if your `/tmp` is a small tmpfs, export
> `npm_config_cache=~/workspace/.npm-cache` (or anywhere roomy) before installing.

## Go live in 10 minutes (real Stripe payments)

Quay ships with full Stripe Checkout integration. When `STRIPE_SECRET_KEY`
is set, `/checkout` redirects buyers to Stripe's hosted checkout; on
`checkout.session.completed` the webhook marks the order paid and mints the
secure download tokens. When the key is absent, checkout runs in clearly
labeled **demo mode** (no charges). Zero code changes needed — just 3 values.

### Click path

**1. Stripe Dashboard → get your keys**
- Go to **Developers → API keys**.
- Copy the **Secret key** (`sk_live_…`) → this is `STRIPE_SECRET_KEY`.
- Copy the **Publishable key** (`pk_live_…`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  (already prefilled in `.env.example`).
- Using a **restricted key** (`rk_live_…`) instead? It works as `STRIPE_SECRET_KEY`
  as long as it has **Write** access to *Checkout Sessions*, *Customers*, and
  *Coupons*. If checkout ever fails with a permissions error, widen those
  permissions on the key or switch to the standard Secret key.

**2. Stripe Dashboard → register the webhook**
- Go to **Developers → Webhooks → Add endpoint**.
- Endpoint URL: `https://<your-domain>/api/webhooks/stripe`
- **Select events**: `checkout.session.completed` → **Add endpoint**.
- Click the endpoint → **Reveal** the **Signing secret** (`whsec_…`)
  → this is `STRIPE_WEBHOOK_SECRET`.

**3. Vercel → paste 3 secrets**
- Vercel dashboard → your project → **Settings → Environment Variables**.
- Add (Environment: **Production**):
  - `STRIPE_SECRET_KEY` = `sk_live_…`
  - `STRIPE_WEBHOOK_SECRET` = `whsec_…`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_…` (prefilled in `.env.example`)
- Also set `NEXT_PUBLIC_SITE_URL` = `https://<your-domain>` (no trailing slash)
  and `QUAY_SECRET` = a random 32-byte hex string (`openssl rand -hex 32`).
- **Redeploy** (env changes need a new deployment).

### Test it

- **Safest:** temporarily use **test-mode** keys (`sk_test_…` / `pk_test_…`) in
  Vercel Preview, pay with card `4242 4242 4242 4242`, any future expiry, any CVC.
- **Live $1 test:** set a product's price to $1 in the dashboard, buy it with
  your own card, then refund yourself in **Stripe Dashboard → Payments**.
- **Confirm the webhook:** Stripe Dashboard → **Developers → Webhooks** →
  click your endpoint → recent deliveries should show **200** for
  `checkout.session.completed`. A 400 means the signing secret is wrong;
  re-copy `whsec_…` into Vercel and redeploy.
- **Confirm the order:** `/dashboard/orders` shows the order as **paid** with
  working `/d/<token>` download links on the success page.

### How the money flow works (for reference)

1. `POST /api/checkout` validates the cart server-side, creates a `pending`
   order, and creates a Stripe Checkout Session (line items incl. order bump;
   discount code applied as a one-time Stripe coupon `quay_<code>`).
2. Buyer pays on Stripe → `success_url` returns them to
   `/success?order=<id>&session_id=…`.
3. Stripe fires `checkout.session.completed` → `/api/webhooks/stripe`
   verifies the signature and calls `finalizeOrder()` (idempotent): marks the
   order paid, mints HMAC download tokens, records expiry/limits, increments
   discount usage, bumps product sales counts.
4. The success page also calls `POST /api/checkout/confirm` (verifies the
   session directly with Stripe) and polls — so buyers get their links even
   if the webhook is delayed.

## Environment variables

Copy `.env.example` → `.env.local`. Full comments (including where each
Stripe value comes from) live in `.env.example`:

| Var | Purpose |
|---|---|
| `QUAY_SECRET` | HMAC secret for signing download tokens and admin sessions. **Required in production** — generate with `openssl rand -hex 32`. A dev fallback is used locally with a console warning. |
| `STRIPE_SECRET_KEY` | Stripe secret key (or a restricted `rk_live_…` with Write on Checkout Sessions, Customers, Coupons). Empty = demo mode (no charges). |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (public by design). |
| `STRIPE_WEBHOOK_SECRET` | Verifies `/api/webhooks/stripe` signatures (`whsec_…`). |
| `NEXT_PUBLIC_SITE_URL` | Deployed base URL — Stripe redirects, sitemap/robots, affiliate links, email download links. |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password. Set = real password login on `/dashboard/login` (httpOnly HMAC session cookie, 7-day expiry). Unset = any-email demo gate with a "demo auth" sticker. Generate: `node scripts/make-admin-hash.mjs "your-password"`. |
| `DATABASE_URL` | Postgres connection string. Set = Postgres adapter (`pg`) is used for all persistence. Unset = JSON files in `data/`. Run `scripts/schema.sql` once first: `psql "$DATABASE_URL" -f scripts/schema.sql`. |
| `RESEND_API_KEY` | Resend API key. Set = buyers get an HTML receipt email with their secure download links on every finalized order. Unset = skipped silently. Email failures never break checkout. |
| `RESEND_FROM` | From address for receipts (default: `Quay <orders@<your-site-host>>`). |

## Admin auth

The dashboard no longer needs Auth.js/Clerk bolted on later — it ships with
real password login:

```bash
node scripts/make-admin-hash.mjs "your-strong-password"
# → paste the printed hash as ADMIN_PASSWORD_HASH (Vercel env or .env.local)
```

- Login page (`/dashboard/login`) verifies with `bcryptjs` and sets an
  **httpOnly, HMAC-signed session cookie** (`lib/session.ts`, Web Crypto so
  it also runs in the edge `middleware.ts`), 7-day expiry.
- Without the hash, the old any-email demo gate stays — with a visible
  "DEMO AUTH" sticker in the dashboard nav so you can't forget.

## Swapping the JSON store for Postgres

All persistence goes through `lib/store.ts` — a `DbAdapter` interface every
call site uses with the same async API. Two adapters ship:

- **JSON** (default): files in `data/`. Zero setup.
- **Postgres** (`lib/db/postgres.ts`, `pg` pool): activates automatically
  when `DATABASE_URL` is set.

Migration:

1. Create the database and run the schema once:
   `psql "$DATABASE_URL" -f scripts/schema.sql`
   (tables: `products`, `orders`, `order_items`, `downloads`,
   `discounts`, `affiliates`, `referrals`, `settings` — full objects live
   in JSONB `data` columns with hot columns indexed).
2. Set `DATABASE_URL` and redeploy. That's it — no code changes.
3. Optional: seed existing JSON data in with a one-off script that reads
   `data/*.json` and calls the store's `save()` methods.
4. The download-count increment (`/api/download/[token]`) still does
   read-modify-write; for high-traffic stores, move it to an atomic
   `UPDATE … SET used = used + 1 WHERE used < max_downloads`.
5. Token *signing* stays in `lib/tokens.ts` — it only needs `QUAY_SECRET`.

## Affiliate system

1. **Dashboard → Affiliates**: add a partner (name + email) — a unique
   referral code is auto-generated and the shareable link
   `<your-site>/r/<code>` is shown with a copy button.
2. The partner shares their link. `/r/<code>` sets a **30-day `quay_ref`
   cookie** and redirects to `/shop` (which shows a small "referred by"
   note while the cookie is present).
3. On purchase, the order stores the referral code; `finalizeOrder()`
   creates a referral record for **order total × commission %** (per-partner
   %, defaulting to the store's **default commission %** in Settings, 20).
4. Pay out from the Affiliates page: referrals list shows commission owed;
   **Mark paid** flips a referral to `paid`.
5. No affiliate rows / no cookie → the whole flow is a no-op. Nothing breaks.

## Email receipts

Set `RESEND_API_KEY` and every finalized order emails the buyer an HTML
receipt: their name, order id, item list, totals, and the secure download
links (sent from `RESEND_FROM` or `Quay <orders@<site-host>>`). Sending
happens in `finalizeOrder()` inside a catch-all — a Resend outage logs a
warning and checkout still completes.

## Deploy to Vercel

```bash
npx vercel
```

1. Add the env vars above in the Vercel dashboard (especially `QUAY_SECRET`).
2. `npm run build` runs the seed automatically, so a fresh deploy starts
   with demo products, discounts, and orders.
3. **Caveat:** the JSON store (`data/*.json`) is file-based. Vercel's
   filesystem is ephemeral — orders/downloads written at runtime are lost on
   redeploy. Fine for a demo; set `DATABASE_URL` for Postgres before real
   traffic (see "Swapping the JSON store for Postgres" above).

## Project layout

```
app/(site)/          marketing homepage, shop, product, checkout, success
app/r/[code]/        affiliate referral links (sets 30-day quay_ref cookie)
app/d/[token]/       secure download page (validates HMAC, expiry, limits)
app/dashboard/       seller dashboard (password auth or demo gate via middleware)
app/api/             products, discounts (+validate), checkout (+confirm),
                     orders (+CSV export), download stream, analytics,
                     settings, config, affiliates, referrals, auth, stripe webhook
lib/                 types, store (JSON/Postgres adapter), tokens (HMAC),
                     session (admin sessions), stripe client, email (Resend),
                     finalize (idempotent order finalization), fmt, cart
data/                products.json, orders.json, discounts.json,
                     settings.json, downloads.json, affiliates.json,
                     referrals.json (seeded)
public/samples/      real sample files served by /api/download/[token]
scripts/seed.mjs     idempotent seeder (runs before `next build`)
scripts/make-admin-hash.mjs  bcrypt hash generator for ADMIN_PASSWORD_HASH
scripts/schema.sql   Postgres schema (run once when DATABASE_URL is set)
middleware.ts        protects /dashboard (session cookie or demo gate)
```

## Demo vs production

| Area | Demo today | Production path |
|---|---|---|
| Payments | Demo mode when `STRIPE_SECRET_KEY` is empty | Set the 3 Stripe env vars — see "Go live in 10 minutes" |
| Auth | Demo gate when `ADMIN_PASSWORD_HASH` is empty | `node scripts/make-admin-hash.mjs "pw"` → set `ADMIN_PASSWORD_HASH` |
| Database | JSON files in `data/` | Set `DATABASE_URL` + run `scripts/schema.sql` |
| Email receipts | Skipped silently | Set `RESEND_API_KEY` (+ optional `RESEND_FROM`) |
| Files | Sample SVGs in `public/samples/` | Real product ZIPs on S3/R2; stream or redirect with signed URLs |
| Webhooks | 200-ok without secret | Set `STRIPE_WEBHOOK_SECRET`, handle events |

## Meta ads (Pixel + Conversions API)

Set `NEXT_PUBLIC_META_PIXEL_ID` and the browser pixel loads everywhere: PageView,
ViewContent (product pages + BuyBox), AddToCart, InitiateCheckout (checkout page),
Purchase (success page). Set `META_CAPI_TOKEN` and every event is also sent
server-side through `lib/meta.ts` — PII is SHA-256 hashed, each event carries a
shared `event_id` so Meta dedupes the browser/server pair, and it never throws
(checkout can't break on a Meta outage).

`META_TEST_EVENT_CODE` (optional) routes CAPI events to Test Events instead of
live reporting while you verify in Events Manager.

**Ad Audiences** (dashboard nav): live status of Pixel/CAPI wiring, plain-language
setup steps, one-click purchaser CSV exports (hashed for Meta upload, plain for
your records), and a competitor-conquest playbook — interest stacks to target
SendOwl/Gumroad-adjacent audiences, lookalike seed guidance, and retargeting
windows (VC 30d / ATC 14d / IC 7d).

## SendOwl-switcher kit

- **License keys** — toggle per product (`requiresLicense`). On purchase,
  `finalizeOrder` mints `XXXX-XXXX-XXXX-XXXX` keys, shows them on the success
  page, the download page (`/d/[token]`), and in the receipt email. Orders
  dashboard shows them per line item.
- **PDF stamping** — on by default (Settings → Delivery & payments). Every PDF
  download gets "Licensed to buyer@email — Order xyz" stamped in the footer via
  `lib/pdfstamp.ts` (pdf-lib, fail-open: serves the unstamped file if stamping
  fails). Toggle off any time.
- **Subscriptions** — set a product's billing to recurring with an interval.
  Stripe sessions are created in subscription mode (one interval per checkout;
  mixed one-time + subscription carts are rejected with a clear error). The
  webhook handles `invoice.payment_succeeded` (extends download access on each
  renewal) and `customer.subscription.deleted` (marks the subscription canceled).
- **CSV product import** — Dashboard → Products → Import CSV. Columns:
  `name, slug?, price, compareAt?, description, fileUrl, bumpName?, bumpPrice?`.
  Files ≤200MB download automatically into `public/samples/`.
- **Embeddable buy buttons** — `public/quay-embed.js`: one script tag + a
  `data-quay-product` button opens checkout in a modal (inline fallback for
  blocked popups). Snippet shown per product in the dashboard and on `/switch`.
- **Abandoned-cart recovery** — typing a valid email on the checkout page saves
  a cart snapshot (debounced); `?restore=<id>` in the reminder link rebuilds the
  cart. Dashboard → Abandoned lists carts, shows time-ago, and has a manual
  reminder button (admin cookie). For fully automatic sends, point any cron at
  `POST /api/checkout/abandon/remind` with `{"cronSecret": "..."}` matching
  `CRON_SECRET` — carts older than `ABANDON_REMIND_AFTER_HOURS` (default 4)
  get one reminder each. Recovered carts are marked when their order finalizes.
- **Stripe Tax** — toggle in Settings → Delivery & payments; adds
  `automatic_tax` to live Stripe sessions (requires Stripe Tax enabled in your
  Stripe dashboard).
- **/switch** — public landing page comparing Quay vs SendOwl vs Gumroad
  (pricing verified Sept 2026) with a 6-step migration checklist. Linked in the
  header nav and footer.
- **Success page** — fires the browser Purchase event with the same `event_id`
  the server used for CAPI, and shows up to 3 "Frequently bought together"
  products.
