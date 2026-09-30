/**
 * Seed Quay's JSON store + sample download files.
 * Idempotent: only creates files that don't exist yet.
 * Run: node scripts/seed.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const SAMPLES = path.join(ROOT, "public", "samples");

fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(SAMPLES, { recursive: true });

function writeIfMissing(name, value) {
  const p = path.join(DATA, name);
  if (fs.existsSync(p)) {
    console.log(`skip  data/${name} (exists)`);
    return;
  }
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + "\n");
  console.log(`wrote data/${name}`);
}

// ---------------------------------------------------------------- products
const products = [
  {
    "id": "prod_celestial_dreams",
    "slug": "celestial-dreams",
    "name": "The Celestial Dreams Collection \u2014 30 Zodiac & Celestial SVG Designs + Commercial License",
    "tagline": "30 hand-coded zodiac & celestial SVGs for Cricut, Silhouette & Etsy sellers.",
    "description": "30 original celestial line-art SVG designs for crafters, Cricut & Silhouette users, Etsy sellers, and small businesses. 12 zodiac sign glyphs, 6 moon designs, 4 constellations, 4 suns, 2 evil eye talismans, and 2 star designs \u2014 all in one cohesive single-weight line style (10px rounded strokes, 1200\u00d71200 viewBox). Perfect for t-shirts, tote bags, stickers, decals, wall art, mugs, and nursery decor. Includes a commercial license for physical products up to 5,000 units per design.",
    "category": "SVG Bundles",
    "price": 14,
    "compareAt": 29,
    "rating": 5.0,
    "reviewCount": 0,
    "salesCount": 0,
    "cover": {
      "bg": "#1B2340",
      "fg": "#FAF6EE",
      "accent": "#FF4D00",
      "pattern": "rings",
      "initials": "CD"
    },
    "files": [
      {
        "name": "celestial-dreams.zip \u2014 30 SVG cut files (12 zodiac glyphs, 6 moons, 4 constellations, 4 suns, 2 evil eyes, 2 star designs)",
        "size": "25 KB"
      },
      {
        "name": "commercial-license.txt \u2014 sell up to 5,000 physical units per design",
        "size": "1 KB"
      },
      {
        "name": "README.txt \u2014 Cricut / Silhouette / Illustrator quick start",
        "size": "4 KB"
      }
    ],
    "sampleFile": "celestial-dreams.zip",
    "bump": {
      "name": "Add the Zodiac Sticker Sheet Pack",
      "description": "12 bonus zodiac designs pre-sized for sticker sheets (Cricut Print-then-Cut ready).",
      "price": 9
    },
    "createdAt": "2026-09-30T22:10:38.444120Z"
  },
  {
    "id": "prod_boho_line_art",
    "slug": "boho-line-art-collection",
    "name": "The Boho Line Art Collection \u2014 54 Original SVG Designs + Commercial License",
    "tagline": "54 hand-coded boho line-art SVGs for Cricut, Silhouette & Etsy sellers.",
    "description": "54 original boho line-art SVG designs for crafters, Cricut & Silhouette users, Etsy sellers, and small businesses. 14 continuous-line faces & portraits, 12 botanicals, 9 celestial designs, 9 abstract arches & shapes, and 10 quote typography designs \u2014 all in one cohesive single-weight line style (10px rounded strokes, 1200\u00d71200 viewBox). Perfect for t-shirts, tote bags, stickers, decals, wall art, mugs, and wedding stationery. Includes a commercial license for physical products up to 5,000 units per design.",
    "category": "SVG Bundles",
    "price": 17,
    "compareAt": 39,
    "rating": 5.0,
    "reviewCount": 0,
    "salesCount": 0,
    "cover": {
      "bg": "#1E3A2F",
      "fg": "#FAF6EE",
      "accent": "#FF4D00",
      "pattern": "waves",
      "initials": "BH"
    },
    "files": [
      {
        "name": "boho-line-art-collection.zip \u2014 54 SVG cut files (14 faces & portraits, 12 botanicals, 9 celestial, 9 abstract & arches, 10 quote typography)",
        "size": "63 KB"
      },
      {
        "name": "commercial-license.txt \u2014 sell up to 5,000 physical units per design",
        "size": "1 KB"
      },
      {
        "name": "README.txt \u2014 Cricut / Silhouette / Illustrator quick start",
        "size": "4 KB"
      }
    ],
    "sampleFile": "boho-line-art-collection.zip",
    "bump": {
      "name": "Add the Extended POD License",
      "description": "Use these designs on print-on-demand products (Printful, Printify, merch) with unlimited units.",
      "price": 12
    },
    "createdAt": "2026-09-30T08:16:25.823371Z"
  },
  {
    id: "prod_svg_bundle",
    slug: "ultimate-svg-bundle",
    name: "The Ultimate SVG Bundle — 2,500 Designs",
    tagline: "Every SVG you'll ever need for your Cricut & Silhouette business.",
    description:
      "2,500 hand-curated SVG cut files across 40 niches: quotes, holidays, animals, florals, sports, teacher designs, and trending best-sellers. Organized in labeled folders with a searchable index. Commercial license included — sell unlimited physical end products.",
    category: "SVG Bundles",
    price: 29,
    compareAt: 79,
    rating: 4.9,
    reviewCount: 1284,
    salesCount: 8312,
    cover: { bg: "#FF4D00", fg: "#FAF6EE", accent: "#141210", pattern: "dots", initials: "SVG" },
    files: [
      { name: "SVG-Bundle-2500/Quotes/", size: "212 MB" },
      { name: "SVG-Bundle-2500/Holidays/", size: "188 MB" },
      { name: "SVG-Bundle-2500/Animals-Florals/", size: "176 MB" },
      { name: "design-index.pdf", size: "8 MB" },
      { name: "commercial-license.txt", size: "4 KB" },
    ],
    sampleFile: "ultimate-svg-bundle-sample.svg",
    bump: {
      name: "Add Extended Commercial License",
      description: "Sell unlimited digital end products too — templates, POD uploads, digital planners.",
      price: 19,
    },
    createdAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "prod_boho_wedding",
    slug: "boho-wedding-invitation-suite",
    name: "Boho Wedding Invitation Suite",
    tagline: "A complete editable stationery set in warm desert tones.",
    description:
      "A 24-piece boho wedding stationery suite: invitation, RSVP, details card, menu, programs, table numbers, signage, and thank-you cards. Fully editable Canva templates with free fonts — change every word, color, and photo in minutes.",
    category: "Invitations",
    price: 19,
    compareAt: 45,
    rating: 4.8,
    reviewCount: 642,
    salesCount: 4120,
    cover: { bg: "#E8D5B5", fg: "#5C3D2E", accent: "#B4652A", pattern: "waves", initials: "BW" },
    files: [
      { name: "canva-template-links.pdf", size: "120 KB" },
      { name: "print-ready-pdfs.zip", size: "96 MB" },
      { name: "font-guide.pdf", size: "2 MB" },
      { name: "personal-license.txt", size: "3 KB" },
    ],
    sampleFile: "boho-wedding-invitation-suite-sample.svg",
    bump: {
      name: "Add Commercial License",
      description: "Use this suite for client weddings and resell printed stationery.",
      price: 19,
    },
    createdAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "prod_coloring",
    slug: "kids-coloring-book-mega-pack",
    name: "Kids Coloring Book Mega Pack",
    tagline: "600 clean-line pages kids actually ask for by name.",
    description:
      "600 printable coloring pages: dinosaurs, unicorns, space, ocean life, holidays, and educational ABC/123 sets. Crisp 300 DPI PDFs, US Letter + A4. Includes 12 ready-to-sell KDP interiors with covers — start a coloring book business this weekend.",
    category: "Printables",
    price: 14,
    compareAt: 39,
    rating: 4.9,
    reviewCount: 2103,
    salesCount: 12480,
    cover: { bg: "#FFC53D", fg: "#141210", accent: "#FF4D00", pattern: "zigzag", initials: "KC" },
    files: [
      { name: "coloring-pages-us-letter.pdf", size: "410 MB" },
      { name: "coloring-pages-a4.pdf", size: "412 MB" },
      { name: "kdp-interiors-12-pack/", size: "188 MB" },
      { name: "commercial-license.txt", size: "4 KB" },
    ],
    sampleFile: "kids-coloring-book-mega-pack-sample.svg",
    bump: {
      name: "Add the KDP Cover Pack",
      description: "36 done-for-you KDP covers matched to the interiors, in Canva + PDF.",
      price: 19,
    },
    createdAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "prod_lightroom",
    slug: "lightroom-presets-golden-hour",
    name: "Lightroom Preset Collection — Golden Hour",
    tagline: "Sun-drenched edits in one click, on mobile or desktop.",
    description:
      "48 golden-hour presets for Lightroom Mobile + Desktop (DNG + XMP). Warm skin tones, glowing skies, zero orange-face syndrome. Includes an install video, before/after guide, and a tweak cheat-sheet for tricky lighting.",
    category: "Presets",
    price: 24,
    compareAt: 59,
    rating: 4.7,
    reviewCount: 489,
    salesCount: 2960,
    cover: { bg: "#1E5B3A", fg: "#FAF6EE", accent: "#FFC53D", pattern: "rings", initials: "GH" },
    files: [
      { name: "golden-hour-mobile-dng.zip", size: "88 MB" },
      { name: "golden-hour-desktop-xmp.zip", size: "12 MB" },
      { name: "install-guide.mp4", size: "64 MB" },
      { name: "tweak-cheatsheet.pdf", size: "3 MB" },
    ],
    sampleFile: "lightroom-presets-golden-hour-sample.svg",
    bump: {
      name: "Add the Moody Nights Pack",
      description: "24 extra presets for blue-hour and indoor low-light shots.",
      price: 19,
    },
    createdAt: "2026-08-20T10:00:00.000Z",
  },
  {
    id: "prod_branding",
    slug: "small-business-branding-kit",
    name: "Small Business Branding Kit",
    tagline: "Look like a six-figure brand by Friday.",
    description:
      "A complete Canva branding kit: primary + secondary logos, 40 submarks and badges, 120 social templates, price-list and invoice templates, brand-guideline workbook, and a 90-minute brand voice mini-course. Built for Etsy shops, boutiques, and service businesses.",
    category: "Branding",
    price: 39,
    compareAt: 129,
    rating: 5.0,
    reviewCount: 318,
    salesCount: 1874,
    cover: { bg: "#141210", fg: "#FAF6EE", accent: "#FF4D00", pattern: "grid", initials: "BK" },
    files: [
      { name: "canva-brand-kit-link.pdf", size: "90 KB" },
      { name: "logo-suite-ai-eps-png/", size: "240 MB" },
      { name: "social-templates-120/", size: "310 MB" },
      { name: "brand-guideline-workbook.pdf", size: "11 MB" },
      { name: "commercial-license.txt", size: "4 KB" },
    ],
    sampleFile: "small-business-branding-kit-sample.svg",
    bump: {
      name: "Add the Client-Ready Pack",
      description: "Proposal, contract, and onboarding templates to sell branding services.",
      price: 19,
    },
    createdAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: "prod_wallart",
    slug: "printable-wall-art-bundle",
    name: "Printable Wall Art Bundle — 120 Prints",
    tagline: "Gallery walls for every room, ready to print tonight.",
    description:
      "120 high-resolution printable art prints: abstract neutrals, botanicals, line art, vintage landscapes, and kids' room sets. 300 DPI files in 5 ratios (fits 24+ frame sizes). Print at home, at Staples, or upload to any print service.",
    category: "Printables",
    price: 17,
    compareAt: 49,
    rating: 4.8,
    reviewCount: 956,
    salesCount: 6730,
    cover: { bg: "#7FB3A3", fg: "#141210", accent: "#FAF6EE", pattern: "stripes", initials: "WA" },
    files: [
      { name: "wall-art-120-prints.zip", size: "1.2 GB" },
      { name: "printing-size-guide.pdf", size: "5 MB" },
      { name: "personal-license.txt", size: "3 KB" },
    ],
    sampleFile: "printable-wall-art-bundle-sample.svg",
    bump: {
      name: "Add Commercial License",
      description: "Sell printed versions at markets, in your shop, or via POD.",
      price: 19,
    },
    createdAt: "2026-09-05T10:00:00.000Z",
  },
];

writeIfMissing("products.json", products);

// ---------------------------------------------------------------- discounts
writeIfMissing("discounts.json", [
  { id: "dsc_welcome10", code: "WELCOME10", type: "percent", value: 10, usedCount: 0, active: true },
  { id: "dsc_bundle20", code: "BUNDLE20", type: "percent", value: 20, minOrder: 30, usedCount: 0, active: true },
  { id: "dsc_flash50", code: "FLASH50", type: "percent", value: 50, maxUses: 20, usedCount: 0, active: true },
]);

// ---------------------------------------------------------------- settings
writeIfMissing("settings.json", {
  storeName: "Quay",
  tagline: "Sell digital downloads. Get paid. Deliver instantly.",
  supportEmail: "support@quay.example",
  linkExpiryHours: 72,
  downloadLimit: 5,
  currency: "USD",
  defaultCommissionPct: 20,
});

writeIfMissing("downloads.json", {});
writeIfMissing("affiliates.json", []);
writeIfMissing("referrals.json", []);

// ---------------------------------------------------------------- orders (~25 over last 30 days)
const FIRST = ["Ava", "Maya", "Sofia", "Liam", "Olivia", "Noah", "Emma", "Mason", "Isabella", "Lucas", "Mia", "Ethan", "Amelia", "James", "Harper", "Evelyn", "Alexander", "Charlotte", "Daniel", "Grace"];
const LAST = ["Carter", "Bennett", "Reyes", "Nguyen", "Patel", "Garcia", "Kim", "Johnson", "Smith", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor"];
const CODES = [undefined, undefined, undefined, "WELCOME10", "WELCOME10", "BUNDLE20", "FLASH50"];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ordersPath = path.join(DATA, "orders.json");
if (!fs.existsSync(ordersPath)) {
  const orders = [];
  const now = Date.now();
  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(now - daysAgo * 86400000 - Math.floor(Math.random() * 86400000)).toISOString();
    const nItems = Math.random() < 0.3 ? 2 : 1;
    const picked = [...products].sort(() => Math.random() - 0.5).slice(0, nItems);
    const items = picked.map((p) => {
      const bump = p.bump && Math.random() < 0.35;
      return {
        productId: p.id,
        productName: p.name,
        price: p.price,
        bump: !!bump,
        bumpPrice: bump ? p.bump.price : 0,
      };
    });
    const subtotal = items.reduce((s, it) => s + it.price + it.bumpPrice, 0);
    const code = rand(CODES);
    let discountAmount = 0;
    if (code === "WELCOME10") discountAmount = subtotal * 0.1;
    if (code === "BUNDLE20" && subtotal >= 30) discountAmount = subtotal * 0.2;
    if (code === "FLASH50") discountAmount = subtotal * 0.5;
    discountAmount = Math.round(discountAmount * 100) / 100;
    const total = Math.round((subtotal - discountAmount) * 100) / 100;
    const email = `${rand(FIRST).toLowerCase()}.${rand(LAST).toLowerCase()}${Math.floor(Math.random() * 90 + 10)}@example.com`;
    orders.push({
      id: "ord_" + (now - daysAgo * 86400000).toString(36) + Math.random().toString(36).slice(2, 7),
      email,
      name: `${rand(FIRST)} ${rand(LAST)}`,
      items,
      subtotal,
      discountCode: discountAmount > 0 ? code : undefined,
      discountAmount,
      total,
      status: Math.random() < 0.06 ? "refunded" : "paid",
      createdAt,
      tokens: [],
    });
  }
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2) + "\n");
  console.log("wrote data/orders.json (25 seeded orders)");
} else {
  console.log("skip  data/orders.json (exists)");
}

// ---------------------------------------------------------------- sample files
function sampleSvg(p) {
  const { bg, fg, accent, initials } = p.cover;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
  <rect width="1200" height="1500" fill="${bg}"/>
  <circle cx="950" cy="250" r="320" fill="${accent}" opacity="0.25"/>
  <circle cx="150" cy="1300" r="260" fill="${accent}" opacity="0.18"/>
  <rect x="120" y="560" width="960" height="380" fill="none" stroke="${fg}" stroke-width="10"/>
  <text x="600" y="800" text-anchor="middle" font-family="Georgia, serif" font-size="220" font-weight="bold" fill="${fg}" letter-spacing="12">${initials}</text>
  <text x="600" y="1060" text-anchor="middle" font-family="Georgia, serif" font-size="52" fill="${fg}">${p.name.split("—")[0].trim().toUpperCase().slice(0, 34)}</text>
  <text x="600" y="1140" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="${fg}" opacity="0.75">SAMPLE PREVIEW — Quay</text>
  <rect x="330" y="1220" width="540" height="90" rx="45" fill="${accent}"/>
  <text x="600" y="1278" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="${bg}">quay.example</text>
</svg>
`;
}

for (const p of products) {
  const sp = path.join(SAMPLES, p.sampleFile);
  if (!fs.existsSync(sp)) {
    fs.writeFileSync(sp, sampleSvg(p));
    console.log(`wrote public/samples/${p.sampleFile}`);
  }
}

const licPath = path.join(SAMPLES, "license.txt");
if (!fs.existsSync(licPath)) {
  fs.writeFileSync(
    licPath,
    `QUAY SAMPLE LICENSE
========================

Thank you for your purchase! This is a SAMPLE file demonstrating
Quay's secure, expiring download delivery.

Your full product files are delivered through your secure download
links, which expire ${72} hours after purchase and allow ${5} downloads each.

Full license terms ship with every product. Questions? Contact support.

— The Quay Team
`
  );
  console.log("wrote public/samples/license.txt");
}

console.log("seed complete");
