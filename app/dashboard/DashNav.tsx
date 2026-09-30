"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/app/components";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "◈" },
  { href: "/dashboard/orders", label: "Orders", icon: "🧾" },
  { href: "/dashboard/products", label: "Products", icon: "▦" },
  { href: "/dashboard/abandoned", label: "Abandoned", icon: "🛒" },
  { href: "/dashboard/discounts", label: "Discounts", icon: "✂" },
  { href: "/dashboard/affiliates", label: "Affiliates", icon: "✦" },
  { href: "/dashboard/audiences", label: "Ad Audiences", icon: "🎯" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

export default function DashNav() {
  const path = usePathname();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"password" | "demo">("demo");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setAuthMode(c.authMode === "password" ? "password" : "demo"))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/dashboard/login");
  }

  return (
    <aside className="dash-side">
      <Wordmark light />
      <nav className="dash-nav" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={path === n.href ? "active" : ""}
          >
            <span style={{ width: 22, textAlign: "center" }}>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <Link href="/shop" style={{ color: "rgba(250,246,238,.6)", fontSize: 13, textDecoration: "none" }}>
          ← View storefront
        </Link>
        {authMode === "demo" ? (
          <div style={{
            border: "2px dashed rgba(250,246,238,.35)", borderRadius: 12, padding: 14, fontSize: 12,
            color: "rgba(250,246,238,.7)",
          }}>
            <strong style={{ color: "var(--gold)" }}>DEMO AUTH</strong><br />
            Any-email gate is active. Set ADMIN_PASSWORD_HASH for real password login.
          </div>
        ) : (
          <div style={{
            border: "2px solid rgba(120,200,120,.4)", borderRadius: 12, padding: 14, fontSize: 12,
            color: "rgba(250,246,238,.7)",
          }}>
            <strong style={{ color: "#8fd694" }}>🔒 PASSWORD AUTH</strong><br />
            Admin session active.
          </div>
        )}
        <button className="mini-btn" onClick={logout} style={{ background: "transparent", color: "var(--paper)", borderColor: "rgba(250,246,238,.4)" }}>
          Log out
        </button>
      </div>
    </aside>
  );
}
