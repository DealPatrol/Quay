export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { verifyAdminSession } from "@/lib/session";
import { store } from "@/lib/store";

/**
 * GET /api/audiences/export?format=hashed|plain — customer list downloads
 * for Meta Custom Audiences (B).
 *
 * format=hashed → Meta's upload format: columns email,fn,ln with SHA256-hashed
 *   values (lowercased/trimmed), ready to drop into Audiences → Create
 *   audience → Custom audience → Customer list.
 * format=plain  → the seller's own use: email,name,order_id,total,created_at.
 *
 * Only paid orders. Deduped by email (latest order wins). Admin-authenticated.
 */
function sha256(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)quay_admin=([^;]*)/);
  const authed =
    (m && (await verifyAdminSession(decodeURIComponent(m[1])))) ||
    (!process.env.ADMIN_PASSWORD_HASH && /(?:^|;\s*)quay_demo=/.test(cookie));
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "plain" ? "plain" : "hashed";

  const paid = (await store.orders.all()).filter((o) => o.status === "paid");
  // Dedupe by email, newest order wins.
  const byEmail = new Map<string, { email: string; name: string; id: string; total: number; createdAt: string }>();
  for (const o of paid) {
    const email = o.email.trim().toLowerCase();
    if (!email || byEmail.has(email)) continue;
    byEmail.set(email, {
      email,
      name: o.name,
      id: o.id,
      total: o.total,
      createdAt: o.createdAt,
    });
  }
  const rows = Array.from(byEmail.values());

  let csv: string;
  let filename: string;
  if (format === "hashed") {
    const lines = ["email,fn,ln"];
    for (const r of rows) {
      const parts = r.name.trim().split(/\s+/).filter(Boolean);
      const fn = parts[0] || "";
      const ln = parts.length > 1 ? parts[parts.length - 1] : "";
      lines.push(
        [
          sha256(r.email),
          fn ? sha256(fn.toLowerCase()) : "",
          ln ? sha256(ln.toLowerCase()) : "",
        ]
          .map(csvCell)
          .join(",")
      );
    }
    csv = lines.join("\n") + "\n";
    filename = "quay-meta-custom-audience.csv";
  } else {
    const lines = ["email,name,order_id,total,created_at"];
    for (const r of rows) {
      lines.push(
        [r.email, r.name, r.id, String(r.total), r.createdAt].map(csvCell).join(",")
      );
    }
    csv = lines.join("\n") + "\n";
    filename = "quay-purchaser-emails.csv";
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
