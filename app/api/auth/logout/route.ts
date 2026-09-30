export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** POST /api/auth/logout — clears the admin session and demo cookies. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set("quay_demo", "", { path: "/", maxAge: 0 });
  return res;
}
