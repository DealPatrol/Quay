"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/fmt";

/** Ticking expiry countdown + download button on the /d/[token] page. */
export default function DownloadPanel({
  token,
  fileName,
  expiresAt,
  remaining,
  maxDownloads,
}: {
  token: string;
  fileName: string;
  expiresAt: number;
  remaining: number;
  maxDownloads: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = expiresAt - now;

  return (
    <div className="card" style={{ textAlign: "center", padding: 40 }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 28 }}>
        <div>
          <div className="display" style={{ fontSize: 38, fontWeight: 900, color: left <= 0 ? "#a32c00" : "var(--ink)" }}>
            {countdown(left)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>
            until link expires
          </div>
        </div>
        <div>
          <div className="display" style={{ fontSize: 38, fontWeight: 900 }}>
            {remaining}<span style={{ opacity: 0.4, fontSize: 24 }}>/{maxDownloads}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.6 }}>
            downloads left
          </div>
        </div>
      </div>

      <a
        href={`/api/download/${token}`}
        className="btn btn-primary"
        style={{ fontSize: 19, padding: "18px 44px" }}
        onClick={() => setStarted(true)}
        download
      >
        ⬇ Download {fileName}
      </a>
      {started && (
        <p className="rise" style={{ marginTop: 16, fontSize: 14, color: "var(--green)", fontWeight: 700 }}>
          ✓ Download started — your remaining count updated above on refresh.
        </p>
      )}
      <p style={{ fontSize: 12, opacity: 0.55, marginTop: 18 }}>
        Having trouble? Contact support with your order email and we&apos;ll re-issue your link.
      </p>
    </div>
  );
}
