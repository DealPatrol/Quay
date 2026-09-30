const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME = "/home/hatch/.cache/puppeteer/chrome-headless-shell/linux-154.0.8037.57/chrome-headless-shell-linux64/chrome-headless-shell";
const OUT = "/home/hatch/workspace/build/quay/qa-shots";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  async function shot(name, url, opts = {}) {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    if (opts.wait) await new Promise((r) => setTimeout(r, opts.wait));
    await page.screenshot({ path: path.join(OUT, name), fullPage: !!opts.full });
    console.log("shot", name);
  }

  // demo login so dashboard pages are reachable
  await page.goto(`${BASE}/api/auth/login`, { waitUntil: "networkidle0" }).catch(() => {});
  await page.evaluate(async () => {
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "qa@example.com" }),
    });
  });

  await shot("01-home.png", `${BASE}/`, { full: true });
  await shot("02-shop.png", `${BASE}/shop`, { full: true });
  await shot("03-product.png", `${BASE}/product/celestial-dreams`, { full: true });
  await shot("04-dashboard.png", `${BASE}/dashboard`, { full: true });
  await shot("05-affiliates.png", `${BASE}/dashboard/affiliates`, { full: true });

  // checkout page: add items to cart via localStorage first
  await page.evaluate(async () => {
    const ps = await fetch("/api/products").then((r) => r.json());
    const cart = [
      { productId: ps.find((p) => p.id === "prod_celestial_dreams").id, bump: true },
      { productId: ps.find((p) => p.id === "prod_boho_line_art").id, bump: false },
    ];
    localStorage.setItem("quay_cart_v1", JSON.stringify(cart));
  });
  await shot("06-checkout.png", `${BASE}/checkout`, { full: true, wait: 1500 });

  await browser.close();
})().catch((e) => {
  console.error("QA SHOT FAILED:", e.message);
  process.exit(1);
});
