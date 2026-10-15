-- Quay Postgres schema.
-- Run once against your database, e.g.:
--   psql "$DATABASE_URL" -f scripts/schema.sql
--
-- Design notes:
--   * Each table stores the full Quay object as JSONB in `data`, so the app's
--     TypeScript interfaces are the source of truth (no column drift).
--   * A few hot columns are mirrored out of the JSON for indexing/filtering
--     (order email/status/total, discount/affiliate codes).
--   * The adapter replaces whole collections on save(), mirroring the
--     JSON-file adapter's whole-file rewrite semantics.

CREATE TABLE IF NOT EXISTS products (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  status     TEXT NOT NULL,
  total      NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_email   ON orders (email);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  data       JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

CREATE TABLE IF NOT EXISTS downloads (
  token      TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL,
  product_id TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_downloads_order ON downloads (order_id);

CREATE TABLE IF NOT EXISTS discounts (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS affiliates (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  email      TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id           TEXT PRIMARY KEY,
  affiliate_id TEXT NOT NULL REFERENCES affiliates (id) ON DELETE CASCADE,
  order_id     TEXT NOT NULL,
  status       TEXT NOT NULL,
  amount       NUMERIC NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON referrals (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_order     ON referrals (order_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status   ON referrals (status);

CREATE TABLE IF NOT EXISTS settings (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- The app keeps exactly one settings row with id = 'main'.
INSERT INTO settings (id, data)
VALUES ('main', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS abandoned (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data       JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_abandoned_email ON abandoned (email);
CREATE INDEX IF NOT EXISTS idx_abandoned_updated ON abandoned (updated_at DESC);

-- Facebook posts + checkout-link first comments (dashboard → Facebook).
CREATE TABLE IF NOT EXISTS fb_posts (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  data       JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fb_posts_created ON fb_posts (created_at DESC);
