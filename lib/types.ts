export interface CoverArt {
  bg: string; // background color
  fg: string; // foreground / text color
  accent: string; // accent color
  pattern: "dots" | "waves" | "grid" | "stripes" | "rings" | "zigzag";
  initials: string; // big letters on the cover
}

export interface ProductFile {
  name: string;
  size: string;
}

export interface OrderBump {
  name: string;
  description: string;
  price: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  price: number;
  compareAt?: number;
  rating: number;
  reviewCount: number;
  salesCount: number;
  cover: CoverArt;
  files: ProductFile[];
  sampleFile: string; // path under public/samples served on download
  bump?: OrderBump;
  requiresLicense?: boolean; // D: mint a license key per unit on finalization
  billing?: "once" | "recurring"; // E: subscriptions (default "once")
  recurringInterval?: "month" | "year"; // E
  createdAt: string;
}

export interface CartItemInput {
  productId: string;
  bump: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  bump: boolean;
  bumpPrice: number;
  licenseKey?: string; // D: minted at finalization when the product requiresLicense
}

export interface OrderSubscription {
  stripeSubscriptionId?: string; // real Stripe sub id (live) or demo placeholder
  status: "active" | "past_due" | "canceled";
  interval: "month" | "year";
  currentPeriodEnd?: string;
}

export interface Order {
  id: string;
  email: string;
  name: string;
  items: OrderItem[];
  subtotal: number;
  discountCode?: string;
  discountAmount: number;
  total: number;
  status: "pending" | "paid" | "refunded";
  createdAt: string;
  tokens: string[]; // download tokens, one per product
  referralCode?: string; // affiliate code from the quay_ref cookie, if any
  metaEventId?: string; // A: shared pixel↔CAPI dedup id for the Purchase event
  subscription?: OrderSubscription; // E
}

export interface Discount {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder?: number;
  maxUses?: number;
  usedCount: number;
  active: boolean;
}

export interface Settings {
  storeName: string;
  tagline: string;
  supportEmail: string;
  linkExpiryHours: number;
  downloadLimit: number;
  currency: string;
  defaultCommissionPct: number; // affiliate commission %, default 20
  pdfStamping?: boolean; // C: stamp buyer email on PDF downloads (default true)
  stripeTax?: boolean; // J: enable Stripe Tax on live Checkout Sessions
}

export interface DownloadRecord {
  orderId: string;
  productId: string;
  expiresAt: number;
  maxDownloads: number;
  used: number;
  createdAt: number;
}

export interface Affiliate {
  id: string;
  name: string;
  email: string;
  code: string; // public referral code, e.g. "maya-4f2k"
  commissionPct: number; // overrides default when set
  createdAt: string;
}

export interface Referral {
  id: string;
  affiliateId: string;
  orderId: string;
  amount: number; // commission owed, in store currency
  status: "unpaid" | "paid";
  createdAt: string;
}

/** F: a checkout that never finished — email captured, cart snapshotted. */
export interface AbandonedCartItem {
  productId: string;
  productName: string;
  price: number;
  bump: boolean;
  bumpPrice: number;
}

export interface AbandonedCart {
  id: string; // unguessable uid — doubles as the restore-link token
  email: string;
  name?: string;
  items: AbandonedCartItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
  remindedAt?: string;
  recoveredOrderId?: string; // set when the buyer later completes checkout
}

/** A Facebook post made/tracked via Quay, with its checkout-link first comment. */
export interface FbPost {
  id: string;
  productId: string;
  postId?: string; // Graph id "{pageId}_{postId}"
  postUrl?: string;
  message?: string; // post text (when published via Quay)
  commentText: string;
  commentId?: string;
  status: "published" | "commented" | "comment_failed" | "failed";
  error?: string;
  createdAt: string;
  updatedAt: string;
}
