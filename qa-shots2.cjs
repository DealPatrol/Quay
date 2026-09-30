const puppeteer = require("puppeteer-core");
const path = require("path");
const CHROME = "/home/hatch/.cache/puppeteer/chrome-headless-shell/linux-154.0.8037.57/chrome-headless-shell-linux64/chrome-headless-shell";
const OUT = "/home/hatch/workspace/build/quay/qa-shots";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/product/boho-line-art-collection`, { waitUntil: "networkidle0" });
  // click "Add to cart" — find the button with that text
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => /add to cart/i.test(b.textContent));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  // fill name/email and pay
  await page.evaluate(() => {
    const inputs = [...document.querySelectorAll("input")];
    const name = inputs.find((i) => /ada lovelace/i.test(i.placeholder || ""));
    const email = inputs.find((i) => i.type === "email");
    if (name) { name.focus(); document.execCommand("insertText", false, "QA Buyer"); }
    if (email) { email.focus(); document.execCommand("insertText", false, "qa-buyer@example.com"); }
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => /^pay /i.test(b.textContent));
    if (btn) btn.click();
  });
  await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 20000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  console.log("landed:", page.url());
  await page.screenshot({ path: path.join(OUT, "07-success.png"), fullPage: true });
  console.log("shot 07-success.png");
  await browser.close();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
