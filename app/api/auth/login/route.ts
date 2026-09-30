export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminSession, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/session";

/**
 * POST /api/auth/login — { email, password }
 *
 * PASSWORD MODE (ADMIN_PASSWORD_HASH set): verifies the password with
 * bcryptjs and sets an httpOnly signed `quay_admin` session cookie (7 days).
 * DEMO MODE (no hash): any valid email sets the legacy `quay_demo` cookie.
 */
export async function POST(req: Request) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) {
    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 401 });
    }
    let ok = false;
    try {
      ok = await bcrypt.compare(password, hash);
    } catch {
      ok = false;
    }
    if (!ok) {
      // Same message for unknown user / wrong password (there's only one admin).
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    const token = await createAdminSession(email);
    const res = NextResponse.json({ ok: true, mode: "password" });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  }

  // ---------------- DEMO MODE ----------------
  const res = NextResponse.json({ ok: true, mode: "demo" });
  res.cookies.set("quay_demo", "1", { path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
