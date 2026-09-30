import fs from "node:fs";
import path from "node:path";
import { createPostgresAdapter } from "./db/postgres";
import type {
  AbandonedCart,
  Affiliate,
  Discount,
  DownloadRecord,
  Order,
  Product,
  Referral,
  Settings,
} from "./types";

/**
 * Pluggable database layer.
 *
 * Every call site uses `store` — an async DbAdapter — and works unchanged
 * against either backend:
 *   - JSON files in ./data (default; zero setup)
 *   - Postgres via `pg` when DATABASE_URL is set
 *     (run scripts/schema.sql once first)
 *
 * Collection semantics are identical in both: save() replaces the whole
 * collection, matching the original whole-file-rewrite behavior.
 */

export interface Collection<T> {
  all(): Promise<T[]>;
  save(items: T[]): Promise<void>;
}

export interface DbAdapter {
  products: Collection<Product>;
  orders: Collection<Order>;
  discounts: Collection<Discount>;
  downloads: {
    all(): Promise<Record<string, DownloadRecord>>;
    save(recs: Record<string, DownloadRecord>): Promise<void>;
  };
  affiliates: Collection<Affiliate>;
  referrals: Collection<Referral>;
  abandoned: Collection<AbandonedCart>;
  settings: {
    get(): Promise<Settings>;
    save(s: Settings): Promise<void>;
  };
}

// ---------------------------------------------------------------- JSON adapter

const DATA_DIR = path.join(process.cwd(), "data");

function file(name: string) {
  return path.join(DATA_DIR, name);
}

function read<T>(name: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(file(name), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Atomic-ish write to avoid torn JSON under concurrent requests.
function writeSafe<T>(name: string, value: T): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = file(name + ".tmp-" + process.pid);
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file(name));
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

function createJsonAdapter(): DbAdapter {
  const coll = <T>(name: string): Collection<T> => ({
    all: async () => read<T[]>(name, []),
    save: async (items) => writeSafe(name, items),
  });
  return {
    products: coll<Product>("products.json"),
    orders: coll<Order>("orders.json"),
    discounts: coll<Discount>("discounts.json"),
    downloads: {
      all: async () => read<Record<string, DownloadRecord>>("downloads.json", {}),
      save: async (d) => writeSafe("downloads.json", d),
    },
    affiliates: coll<Affiliate>("affiliates.json"),
    referrals: coll<Referral>("referrals.json"),
    abandoned: coll<AbandonedCart>("abandoned.json"),
    settings: {
      get: async () => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>("settings.json", {}) }),
      save: async (s) => writeSafe("settings.json", s),
    },
  };
}

// ---------------------------------------------------------------- selection

function createAdapter(): DbAdapter {
  if (process.env.DATABASE_URL) {
    console.log("[quay] database: postgres (DATABASE_URL set)");
    return createPostgresAdapter();
  }
  return createJsonAdapter();
}

let adapter: DbAdapter | null = null;

/** The store every call site uses. Same async API on JSON or Postgres. */
export const store: DbAdapter = new Proxy({} as DbAdapter, {
  get(_t, prop: keyof DbAdapter) {
    if (!adapter) adapter = createAdapter();
    const ns = adapter[prop] as unknown;
    return ns;
  },
});

export function uid(prefix: string): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}
