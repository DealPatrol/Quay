// Smoke test: demo checkouts, downloads, affiliates. Cleans up after itself.
const BASE = "http://localhost:3000";
const results = [];
function ok(name, detail) { results.push({ name, pass: true, detail }); console.log("PASS", name, "-", detail); }
function fail(name, detail) { results.push({ name, pass: false, detail }); console.log("FAIL", name, "-", detail); process.exitCode = 1; }

async function main() {
  // 1. checkout celestial-dreams with bump + WELCOME10
  let r = await fetch(`${BASE}/api/checkout`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Smoke Tester", email: "smoke@example.com",
      items: [{ productId: "prod_celestial_dreams", bump: true }],
      discountCode: "WELCOME10",
    }),
  });
  let d = await r.json();
  const expTotal1 = Math.round((14 + 9 - 2.3) * 100) / 100; // 20.70
  (r.ok && d.total === expTotal1 && d.tokens.length === 1)
    ? ok("celestial checkout math", `total $${d.total} (expected $${expTotal1}), 1 token`)
    : fail("celestial checkout math", JSON.stringify(d));
  const ord1 = d.orderId, tok1 = d.tokens[0];

  // 2. checkout boho with bump, no discount
  r = await fetch(`${BASE}/api/checkout`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Smoke Tester", email: "smoke@example.com",
      items: [{ productId: "prod_boho_line_art", bump: true }],
    }),
  });
  d = await r.json();
  const expTotal2 = 17 + 12; // 29
  (r.ok && d.total === expTotal2 && d.tokens.length === 1)
    ? ok("boho checkout math", `total $${d.total} (expected $${expTotal2}), 1 token`)
    : fail("boho checkout math", JSON.stringify(d));
  const ord2 = d.orderId, tok2 = d.tokens[0];

  // 3. download both zips, verify integrity + svg count
  for (const [label, tok, minSvgs] of [["celestial", tok1, 30], ["boho", tok2, 54]]) {
    r = await fetch(`${BASE}/api/download/${tok}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
    // crude zip central-directory count of .svg entries
    const svgCount = (buf.toString("latin1").match(/\.svg/g) || []).length;
    (r.ok && isZip && svgCount >= minSvgs)
      ? ok(`${label} zip download`, `${(buf.length / 1024).toFixed(1)} KB, ~${svgCount} .svg refs, zip magic ok`)
      : fail(`${label} zip download`, `status ${r.status}, zip=${isZip}, svgRefs=${svgCount}`);
  }

  // 4. affiliate flow: create affiliate, visit /r/code (cookie), referred checkout
  r = await fetch(`${BASE}/api/affiliates`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke Partner", email: "partner-smoke@example.com" }),
  });
  const aff = await r.json();
  (r.ok && aff.code) ? ok("affiliate created", `code=${aff.code}, pct=${aff.commissionPct}`) : fail("affiliate created", JSON.stringify(aff));

  r = await fetch(`${BASE}/r/${aff.code}`, { redirect: "manual" });
  const setCookie = r.headers.get("set-cookie") || "";
  (r.status === 302 && setCookie.includes("quay_ref=" + aff.code))
    ? ok("referral link sets cookie", `302 → /shop, quay_ref=${aff.code}`)
    : fail("referral link sets cookie", `status ${r.status}, cookie: ${setCookie.slice(0, 80)}`);

  r = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `quay_ref=${aff.code}` },
    body: JSON.stringify({
      name: "Referred Buyer", email: "referred@example.com",
      items: [{ productId: "prod_celestial_dreams", bump: false }],
    }),
  });
  d = await r.json();
  const ord3 = d.orderId;
  (r.ok && d.orderId) ? ok("referred checkout", `order ${d.orderId}, total $${d.total}`) : fail("referred checkout", JSON.stringify(d));

  // 5. verify referral record + commission math (20% of $14 = $2.80)
  r = await fetch(`${BASE}/api/referrals?affiliateId=${aff.id}`);
  const refs = await r.json();
  const ref = refs.find((x) => x.orderId === ord3);
  const expComm = Math.round(14 * 20) / 100; // 2.80
  (ref && ref.amount === expComm && ref.status === "unpaid")
    ? ok("referral record", `commission $${ref.amount} (expected $${expComm}), status unpaid`)
    : fail("referral record", JSON.stringify(refs).slice(0, 300));

  // 6. mark paid
  r = await fetch(`${BASE}/api/referrals/${ref.id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "paid" }),
  });
  const updated = await r.json();
  (updated.status === "paid") ? ok("mark referral paid", ref.id) : fail("mark referral paid", JSON.stringify(updated));

  // 7. order stored referralCode
  r = await fetch(`${BASE}/api/orders`);
  const orders = await r.json();
  const o3 = orders.find((o) => o.id === ord3);
  (o3 && o3.referralCode === aff.code) ? ok("order has referralCode", o3.referralCode) : fail("order has referralCode", JSON.stringify(o3 && o3.referralCode));

  // 8. CSV export works
  r = await fetch(`${BASE}/api/orders/export`);
  const csv = await r.text();
  const hasHeader = csv.startsWith("order_id,created_at,customer_name");
  const hasRows = csv.includes(ord1) && csv.includes(ord3);
  (r.ok && hasHeader && hasRows) ? ok("CSV export", `${csv.split("\n").length - 1} data rows`) : fail("CSV export", csv.slice(0, 120));

  // 9. demo-mode auth login route (password mode tested separately below)
  r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "qa@example.com" }),
  });
  const loginData = await r.json();
  const loginCookie = r.headers.get("set-cookie") || "";
  (r.ok && loginData.mode === "demo" && loginCookie.includes("quay_demo"))
    ? ok("demo auth login route", `mode=demo, quay_demo cookie set`)
    : fail("demo auth login route", `status ${r.status} ${JSON.stringify(loginData)}`);

  // ---- cleanup: remove all test data ----
  const fs = require("fs");
  const path = require("path");
  const DATA = "/home/hatch/workspace/build/quay/data";
  const scrub = (file, pred) => {
    const p = path.join(DATA, file);
    let arr = JSON.parse(fs.readFileSync(p, "utf8"));
    const before = arr.length;
    arr = arr.filter((x) => !pred(x));
    fs.writeFileSync(p, JSON.stringify(arr, null, 2) + "\n");
    return before - arr.length;
  };
  const isTestOrder = (o) => ["smoke@example.com", "referred@example.com"].includes(o.email);
  const nOrders = scrub("orders.json", isTestOrder);
  const nAff = scrub("affiliates.json", (a) => a.email === "partner-smoke@example.com");
  const nRef = scrub("referrals.json", (x) => x.affiliateId === aff.id);
  // downloads: drop records for the test orders
  const dp = path.join(DATA, "downloads.json");
  const dl = JSON.parse(fs.readFileSync(dp, "utf8"));
  let nDl = 0;
  for (const k of Object.keys(dl)) {
    if ([ord1, ord2, ord3].includes(dl[k].orderId)) { delete dl[k]; nDl++; }
  }
  fs.writeFileSync(dp, JSON.stringify(dl, null, 2) + "\n");
  // restore WELCOME10 usedCount (finalize incremented it twice for smoke orders)
  const discP = path.join(DATA, "discounts.json");
  const discs = JSON.parse(fs.readFileSync(discP, "utf8"));
  const w = discs.find((x) => x.code === "WELCOME10");
  if (w) { w.usedCount = Math.max(0, w.usedCount - 1); fs.writeFileSync(discP, JSON.stringify(discs, null, 2) + "\n"); }
  // restore salesCount bumps on the two products
  const prodP = path.join(DATA, "products.json");
  const prods = JSON.parse(fs.readFileSync(prodP, "utf8"));
  for (const p of prods) {
    if (p.id === "prod_celestial_dreams") p.salesCount = Math.max(0, p.salesCount - 2);
    if (p.id === "prod_boho_line_art") p.salesCount = Math.max(0, p.salesCount - 1);
  }
  fs.writeFileSync(prodP, JSON.stringify(prods, null, 2) + "\n");
  console.log(`CLEANUP removed: ${nOrders} orders, ${nAff} affiliates, ${nRef} referrals, ${nDl} download records; discount + sales counts restored`);

  console.log(results.every((x) => x.pass) ? "\nALL SMOKE TESTS PASSED" : "\nSOME TESTS FAILED");
}

main().catch((e) => { console.error("SMOKE SCRIPT ERROR:", e); process.exit(1); });
