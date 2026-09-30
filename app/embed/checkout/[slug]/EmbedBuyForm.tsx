"use client";

import { useState } from "react";

/** Mini checkout form for the embed iframe. Hands off to Stripe or demo success. */
export default function EmbedBuyForm({
  productId,
  productName,
  price,
  billing,
  recurringInterval,
}: {
  productId: string;
  productName: string;
  price: number;
  billing?: string;
  recurringInterval?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const recurring = billing === "recurring";
  const perLabel = recurring ? (recurringInterval === "year" ? "/yr" : "/mo") : "";

  async function buy() {
    setErr("");
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      setErr("Please enter your name and a valid email.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, items: [{ productId, bump: false }] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed.");
      // Escape the iframe: Stripe or the success page takes the whole tab.
      if (data.url) window.top!.location.href = data.url;
      else window.top!.location.href = `/success?order=${data.orderId}`;
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  const input: React.CSSProperties = {
    width: "100%", padding: "12px 14px", fontSize: 15,
    border: "2px solid #141210", borderRadius: 10, background: "#fff",
    fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>Full name</label>
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>Email — download links go here</label>
        <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" />
      </div>
      {err && <p style={{ color: "#a32c00", fontWeight: 700, fontSize: 14 }}>{err}</p>}
      <button
        onClick={buy}
        disabled={busy}
        style={{
          width: "100%", padding: "16px", fontSize: 17, fontWeight: 700,
          fontFamily: "inherit", color: "#fff", background: "#FF4D00",
          border: "3px solid #141210", borderRadius: 14, cursor: "pointer",
          boxShadow: "4px 4px 0 #141210", opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? "Processing…" : `Buy ${productName.split("—")[0].trim()} — $${price}${perLabel}`}
      </button>
      {recurring && (
        <p style={{ fontSize: 12, textAlign: "center", opacity: 0.65, marginTop: 8 }}>
          🔁 Billed {recurringInterval === "year" ? "yearly" : "monthly"}. Cancel anytime.
        </p>
      )}
    </div>
  );
}
