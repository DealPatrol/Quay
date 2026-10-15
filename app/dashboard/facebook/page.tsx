"use client";

import { useEffect, useState } from "react";
import type { FbPost, Product } from "@/lib/types";

const DEFAULT_TEMPLATE = "Shop it here 👉 {link}";

const STATUS_LABEL: Record<FbPost["status"], string> = {
  published: "posted (no comment)",
  commented: "comment added",
  comment_failed: "comment failed",
  failed: "failed",
};

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers without clipboard permission.
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export default function FacebookPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [connected, setConnected] = useState(false);
  const [posts, setPosts] = useState<FbPost[]>([]);
  const [productId, setProductId] = useState("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [addComment, setAddComment] = useState(true);
  const [existing, setExisting] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () =>
    fetch("/api/facebook")
      .then((r) => r.json())
      .then((d) => { setConnected(!!d.connected); setPosts(d.posts || []); })
      .catch(() => {});

  useEffect(() => {
    load();
    fetch("/api/products").then((r) => r.json()).then((ps: Product[]) => {
      setProducts(ps);
      if (ps[0]) setProductId(ps[0].id);
    });
    const saved = typeof window !== "undefined" && localStorage.getItem("quay_fb_template");
    if (saved) setTemplate(saved);
  }, []);

  useEffect(() => {
    if (!productId) return;
    localStorage.setItem("quay_fb_template", template);
    const t = setTimeout(() => {
      fetch("/api/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", productId, template }),
      }).then((r) => r.json()).then((d) => setPreview(d.commentText || "")).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [productId, template]);

  async function run(payload: Record<string, unknown>) {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch("/api/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, template, ...payload }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok && !d.status) setNotice({ ok: false, text: d.error || "Something went wrong." });
      else if (d.status === "comment_failed") setNotice({ ok: false, text: `${d.postUrl && payload.action === "publish" ? "Post published, but the comment failed: " : ""}${d.error} — use Copy comment and paste it manually.` });
      else setNotice({ ok: true, text: d.status === "commented" ? "Done — checkout link added as a comment." : "Post published." });
      if (payload.action === "publish" && res.ok) setMessage("");
      if (payload.action === "comment" && d.status === "commented") setExisting("");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function doCopy() {
    if (preview && (await copy(preview))) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  }

  const productName = (id: string) => products.find((p) => p.id === id)?.name || id;

  return (
    <>
      <p className="kicker"><span className="tick">✦</span> Dashboard</p>
      <h1 className="display" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 900 }}>
        Facebook<span style={{ color: "var(--orange)" }}>.</span>
      </h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>Drop a product&apos;s checkout link into the comments of your posts.</p>

      <div className="card" style={{ marginTop: 20, fontSize: 14 }}>
        {connected ? (
          <span><span className="pill active">connected</span> Facebook Page linked — Quay can post and comment for you.</span>
        ) : (
          <span>
            <span className="pill off">not connected</span> No Facebook Page linked, so use <strong>Copy comment</strong> and paste it
            under your post. (Set <code>FB_PAGE_ID</code> + <code>FB_PAGE_ACCESS_TOKEN</code> to automate it. Personal profiles and
            Groups always need copy/paste.)
          </span>
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="field"><label>Product</label>
            <select className="select" value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Comment text ({"{link}"}, {"{name}"}, {"{price}"})</label>
            <input className="input" value={template} onChange={(e) => setTemplate(e.target.value)} placeholder={DEFAULT_TEMPLATE} />
          </div>
        </div>
        <div className="field" style={{ marginTop: 10 }}><label>Comment preview</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <code style={{ flex: 1, padding: 10, border: "2px dashed var(--ink)", borderRadius: 10, wordBreak: "break-all" }}>{preview || "…"}</code>
            <button className="btn" onClick={doCopy} disabled={!preview}>{copied ? "Copied ✓" : "Copy comment"}</button>
          </div>
        </div>
      </div>

      {connected && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, marginTop: 18 }}>
          <div className="card">
            <h2 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>New Page post</h2>
            <div className="field"><label>Post text</label>
              <textarea className="input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="New drop! …" />
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0", fontSize: 14 }}>
              <input type="checkbox" checked={addComment} onChange={(e) => setAddComment(e.target.checked)} />
              Add checkout link as first comment
            </label>
            <button className="btn btn-primary" disabled={busy || !message.trim() || !productId} onClick={() => run({ action: "publish", message, addComment })}>
              {busy ? "Working…" : "Publish to Page"}
            </button>
          </div>
          <div className="card">
            <h2 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Comment on an existing post</h2>
            <div className="field"><label>Post URL or id</label>
              <input className="input" value={existing} onChange={(e) => setExisting(e.target.value)} placeholder="https://www.facebook.com/yourpage/posts/123…" />
            </div>
            <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={busy || !existing.trim() || !productId} onClick={() => run({ action: "comment", post: existing })}>
              {busy ? "Working…" : "Add checkout comment"}
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="card" role="status" style={{ marginTop: 18, borderColor: notice.ok ? "#3a8f3f" : "var(--orange)" }}>{notice.text}</div>
      )}

      {posts.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h2 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>History</h2>
          {posts.map((p) => (
            <div key={p.id} className="leader-row" style={{ fontSize: 14, padding: "6px 0" }}>
              <span>{new Date(p.createdAt).toLocaleString()} · {productName(p.productId)}</span>
              <span className="leader-dots" />
              {p.postUrl && <a href={p.postUrl} target="_blank" rel="noreferrer" style={{ marginRight: 10 }}>post ↗</a>}
              <strong title={p.error || p.commentId || ""}>{STATUS_LABEL[p.status]}</strong>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
