"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Seller login. POSTs to /api/auth/login, which picks the mode:
 *  - ADMIN_PASSWORD_HASH set → real password login (httpOnly session cookie)
 *  - unset → demo gate, any email works (with a visible "demo auth" sticker)
 */
export default function DashboardLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "password" | "demo">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setMode(c.authMode === "password" ? "password" : "demo"))
      .catch(() => setMode("demo"));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErr("Enter a valid email.");
      return;
    }
    if (mode === "password" && !password) {
      setErr("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: mode === "password" ? password : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      router.push("/dashboard");
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 480 }}>
        <Link href="/" className="wordmark" style={{ marginBottom: 32, display: "inline-flex" }}>
          <span className="q">Q</span> Quay
        </Link>
        <div className="card tilt-l">
          <span className="sticker">seller login</span>
          <h1 className="display" style={{ fontSize: 38, fontWeight: 900, margin: "16px 0 8px" }}>
            Welcome back<span style={{ color: "var(--orange)" }}>.</span>
          </h1>
          {mode === "demo" && (
            <p style={{ fontSize: 15, color: "var(--ink-soft)", marginBottom: 24 }}>
              This is a <strong>demo gate</strong> — any email unlocks the dashboard.
              Set <code>ADMIN_PASSWORD_HASH</code> to enable real password login.
            </p>
          )}
          {mode === "password" && (
            <p style={{ fontSize: 15, color: "var(--ink-soft)", marginBottom: 24 }}>
              Sign in with your admin credentials.
            </p>
          )}
          <form onSubmit={login}>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@yourshop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            {mode === "password" && (
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            )}
            {err && <p style={{ color: "#a32c00", fontWeight: 700, marginBottom: 12 }}>{err}</p>}
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy || mode === "loading"}>
              {busy ? "Signing in…" : "Enter dashboard →"}
            </button>
          </form>
          {mode === "demo" && (
            <p style={{ marginTop: 18, fontSize: 12, opacity: 0.6 }}>
              Generate a hash with <code>node scripts/make-admin-hash.mjs "your-password"</code> — see README.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
