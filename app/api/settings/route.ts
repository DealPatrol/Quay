export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await store.settings.get());
}

export async function PUT(req: Request) {
  const body = await req.json();
  const current = await store.settings.get();
  const next = {
    storeName: String(body.storeName || current.storeName),
    tagline: String(body.tagline ?? current.tagline),
    supportEmail: String(body.supportEmail || current.supportEmail),
    linkExpiryHours: Math.max(1, Number(body.linkExpiryHours) || current.linkExpiryHours),
    downloadLimit: Math.max(1, Math.floor(Number(body.downloadLimit)) || current.downloadLimit),
    currency: current.currency,
    defaultCommissionPct: Math.min(100, Math.max(0, Number(body.defaultCommissionPct ?? current.defaultCommissionPct ?? 20))),
  };
  await store.settings.save(next);
  return NextResponse.json(next);
}
