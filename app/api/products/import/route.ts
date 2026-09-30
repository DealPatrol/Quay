export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { verifyAdminSession } from "@/lib/session";
import { store, uid } from "@/lib/store";
import type { Product } from "@/lib/types";

/**
 * POST /api/products/import — bulk-create products from a CSV.
 * Body: { csv: string }
 *
 * Columns: name, slug?, price, compareAt?, description, fileUrl,
 *          bumpName?, bumpPrice?
 *   - name, price are required per row; slug is generated from the name when
 *     missing (must be unique).
 *   - fileUrl must be an http(s) URL; the server downloads it into
 *     public/samples/<slug>-<filename> and wires it as the product's
 *     downloadable file. Max 200 MB per file.
 *
 * Returns { created: [...], errors: [{ row, error }] } — per-row results.
 * Admin-authenticated.
 */

const MAX_FILE_BYTES = 200 * 1024 * 1024;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c === "\r") {
      // skip — handled with \n
    } else {
      cur += c;
    }
  }
  if (cur !== "" || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function safeBasename(url: string, fallback: string): string {
  try {
    const u = new URL(url);
    const base = path.basename(u.pathname) || fallback;
    return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || fallback;
  } catch {
    return fallback;
  }
}

async function authed(req: Request): Promise<boolean> {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)quay_admin=([^;]*)/);
  return !!(
    (m && (await verifyAdminSession(decodeURIComponent(m[1])))) ||
    (!process.env.ADMIN_PASSWORD_HASH && /(?:^|;\s*)quay_demo=/.test(cookie))
  );
}

export async function POST(req: Request) {
  if (!(await authed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let csv = "";
  try {
    csv = ((await req.json()) as any).csv || "";
  } catch {
    return NextResponse.json({ error: "JSON body with { csv } required" }, { status: 400 });
  }
  if (!csv.trim()) return NextResponse.json({ error: "empty CSV" }, { status: 400 });

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV needs a header row plus at least one data row" }, { status: 400 });
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iName = idx("name");
  const iSlug = idx("slug");
  const iPrice = idx("price");
  if (iName === -1 || iPrice === -1) {
    return NextResponse.json(
      { error: "required columns: name, price (optional: slug, compareAt, description, fileUrl, bumpName, bumpPrice)" },
      { status: 400 }
    );
  }

  const products = await store.products.all();
  const created: Product[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNo = r + 1;
    try {
      const name = (row[iName] || "").trim();
      if (!name) throw new Error("name is required");
      const price = Number((row[iPrice] || "").trim());
      if (!Number.isFinite(price) || price <= 0) throw new Error(`bad price "${row[iPrice]}"`);
      let slug = iSlug !== -1 && row[iSlug] ? slugify(row[iSlug]) : slugify(name);
      if (!slug) throw new Error("could not derive a slug");
      if (products.some((p) => p.slug === slug) || created.some((p) => p.slug === slug)) {
        throw new Error(`slug "${slug}" already exists`);
      }

      const get = (col: string) => {
        const i = idx(col);
        return i !== -1 ? (row[i] || "").trim() : "";
      };
      const compareAtRaw = get("compareat");
      const bumpPriceRaw = get("bumpprice");
      const fileUrl = get("fileurl");

      // Download the deliverable file into public/samples/.
      let sampleFile = "license.txt";
      let files: { name: string; size: string }[] = [];
      if (fileUrl) {
        let u: URL;
        try {
          u = new URL(fileUrl);
        } catch {
          throw new Error(`bad fileUrl "${fileUrl}"`);
        }
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          throw new Error("fileUrl must be http(s)");
        }
        const samplesDir = path.join(process.cwd(), "public", "samples");
        fs.mkdirSync(samplesDir, { recursive: true });
        const fileName = `${slug}-${safeBasename(fileUrl, "file")}`;
        const dest = path.join(samplesDir, fileName);
        const res = await fetch(fileUrl, { signal: AbortSignal.timeout(60000) });
        if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > MAX_FILE_BYTES) throw new Error("file exceeds 200 MB");
        if (buf.length === 0) throw new Error("downloaded file is empty");
        fs.writeFileSync(dest, buf);
        sampleFile = fileName;
        const kb = buf.length / 1024;
        files = [{ name: fileName, size: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB` }];
      }

      const bumpName = get("bumpname");
      const product: Product = {
        id: uid("prod_"),
        slug,
        name,
        tagline: (get("description") || "").slice(0, 120),
        description: get("description"),
        category: "Imported",
        price: Math.round(price * 100) / 100,
        compareAt: compareAtRaw ? Number(compareAtRaw) : undefined,
        rating: 5,
        reviewCount: 0,
        salesCount: 0,
        cover: { bg: "#FF4D00", fg: "#FAF6EE", accent: "#141210", pattern: "dots", initials: name.slice(0, 2).toUpperCase() },
        files,
        sampleFile,
        bump: bumpName
          ? {
              name: bumpName,
              description: "",
              price: bumpPriceRaw ? Math.round(Number(bumpPriceRaw) * 100) / 100 : 0,
            }
          : undefined,
        createdAt: new Date().toISOString(),
      };
      products.push(product);
      created.push(product);
    } catch (e: any) {
      errors.push({ row: rowNo, error: e?.message || "unknown error" });
    }
  }

  await store.products.save(products);
  return NextResponse.json({
    created: created.map((p) => ({ id: p.id, slug: p.slug, name: p.name, sampleFile: p.sampleFile })),
    errors,
  });
}
