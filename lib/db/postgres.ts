/**
 * Postgres adapter for the Quay store.
 *
 * Activated ONLY when DATABASE_URL is set (see lib/store.ts). Implements the
 * same DbAdapter interface as the JSON-file adapter, so every call site works
 * unchanged against either backend.
 *
 * Semantics mirror the JSON adapter: save() replaces the whole collection
 * (done here in a transaction). Tables are created by scripts/schema.sql —
 * run it once against your database before going live:
 *   psql "$DATABASE_URL" -f scripts/schema.sql
 */
import { Pool } from "pg";
import type {
  AbandonedCart,
  Affiliate,
  Discount,
  DownloadRecord,
  Order,
  Product,
  Referral,
  Settings,
} from "../types";
import type { DbAdapter } from "../store";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("[quay] DATABASE_URL is not set");
    pool = new Pool({
      connectionString: url,
      max: 5,
      // Most managed Postgres (Neon, Supabase, RDS) needs SSL.
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
    });
    pool.on("error", (e) => console.error("[quay] pg pool error:", e.message));
  }
  return pool;
}

const DEFAULT_SETTINGS: Settings = {
  storeName: "Quay",
  tagline: "Sell digital downloads. Get paid. Deliver instantly.",
  supportEmail: "support@quay.example",
  linkExpiryHours: 72,
  downloadLimit: 5,
  currency: "USD",
  defaultCommissionPct: 20,
  pdfStamping: true,
  stripeTax: false,
};

/** Replace a table's full contents inside a transaction (JSON-adapter semantics). */
async function replaceAll(
  table: string,
  rows: { key: [string, string][]; data: unknown }[],
  keyCols: string[]
): Promise<void> {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM ${table}`);
    for (const r of rows) {
      const cols = [...keyCols, "data"];
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const keyVals = r.key.map(([, v]) => v);
      await client.query(
        `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
        [...keyVals, JSON.stringify(r.data)]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function loadAll<T>(table: string, orderBy = ""): Promise<T[]> {
  const { rows } = await getPool().query(`SELECT data FROM ${table} ${orderBy}`);
  return rows.map((r) => r.data as T);
}

export function createPostgresAdapter(): DbAdapter {
  return {
    products: {
      all: () => loadAll<Product>("products"),
      save: (items) =>
        replaceAll(
          "products",
          items.map((p) => ({ key: [["id", p.id], ["slug", p.slug]], data: p })),
          ["id", "slug"]
        ),
    },
    orders: {
      all: () => loadAll<Order>("orders", "ORDER BY created_at DESC"),
      save: async (items) => {
        await replaceAll(
          "orders",
          items.map((o) => ({
            key: [
              ["id", o.id],
              ["email", o.email],
              ["status", o.status],
              ["total", String(o.total)],
              ["created_at", o.createdAt],
            ],
            data: o,
          })),
          ["id", "email", "status", "total", "created_at"]
        );
        // Keep the normalized order_items table in sync (useful for SQL analytics).
        const p = getPool();
        const client = await p.connect();
        try {
          await client.query("BEGIN");
          await client.query("DELETE FROM order_items");
          for (const o of items) {
            for (const it of o.items) {
              await client.query(
                "INSERT INTO order_items (id, order_id, product_id, data) VALUES ($1,$2,$3,$4)",
                [
                  `${o.id}:${it.productId}`,
                  o.id,
                  it.productId,
                  JSON.stringify({ ...it, orderId: o.id }),
                ]
              );
            }
          }
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      },
    },
    discounts: {
      all: () => loadAll<Discount>("discounts"),
      save: (items) =>
        replaceAll(
          "discounts",
          items.map((d) => ({ key: [["id", d.id], ["code", d.code]], data: d })),
          ["id", "code"]
        ),
    },
    downloads: {
      all: async () => {
        const { rows } = await getPool().query("SELECT token, data FROM downloads");
        const out: Record<string, DownloadRecord> = {};
        for (const r of rows) out[r.token as string] = r.data as DownloadRecord;
        return out;
      },
      save: (recs) =>
        replaceAll(
          "downloads",
          Object.entries(recs).map(([token, r]) => ({
            key: [["token", token], ["order_id", r.orderId], ["product_id", r.productId]],
            data: r,
          })),
          ["token", "order_id", "product_id"]
        ),
    },
    affiliates: {
      all: () => loadAll<Affiliate>("affiliates"),
      save: (items) =>
        replaceAll(
          "affiliates",
          items.map((a) => ({
            key: [["id", a.id], ["code", a.code], ["email", a.email]],
            data: a,
          })),
          ["id", "code", "email"]
        ),
    },
    referrals: {
      all: () => loadAll<Referral>("referrals", "ORDER BY created_at DESC"),
      save: (items) =>
        replaceAll(
          "referrals",
          items.map((r) => ({
            key: [
              ["id", r.id],
              ["affiliate_id", r.affiliateId],
              ["order_id", r.orderId],
              ["status", r.status],
              ["amount", String(r.amount)],
            ],
            data: r,
          })),
          ["id", "affiliate_id", "order_id", "status", "amount"]
        ),
    },
    abandoned: {
      all: () => loadAll<AbandonedCart>("abandoned", "ORDER BY updated_at DESC"),
      save: (items) =>
        replaceAll(
          "abandoned",
          items.map((a) => ({
            key: [
              ["id", a.id],
              ["email", a.email],
              ["updated_at", a.updatedAt],
            ],
            data: a,
          })),
          ["id", "email", "updated_at"]
        ),
    },
    settings: {
      get: async () => {
        const { rows } = await getPool().query("SELECT data FROM settings WHERE id = 'main'");
        if (rows.length === 0) return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...(rows[0].data as Partial<Settings>) };
      },
      save: async (s) => {
        await getPool().query(
          `INSERT INTO settings (id, data) VALUES ('main', $1)
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
          [JSON.stringify(s)]
        );
      },
    },
  };
}
