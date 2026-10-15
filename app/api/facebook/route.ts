export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store, uid } from "@/lib/store";
import { isAdminRequest } from "@/lib/admin-auth";
import { siteUrl } from "@/lib/stripe";
import type { FbPost } from "@/lib/types";
import {
  checkoutLink,
  commentOnPost,
  friendlyGraphError,
  getFbConfig,
  parsePostId,
  postUrl,
  publishPagePost,
  renderComment,
} from "@/lib/facebook";

const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

async function loadPosts(): Promise<FbPost[]> {
  try {
    return await store.fbPosts.all();
  } catch (e) {
    console.error("[quay] fb_posts load failed:", (e as Error).message);
    return [];
  }
}

/** Persisting history is best-effort: a storage failure must not hide a successful FB action. */
async function record(rec: FbPost): Promise<boolean> {
  try {
    const all = await loadPosts();
    await store.fbPosts.save([rec, ...all.filter((p) => p.id !== rec.id)].slice(0, 500));
    return true;
  } catch (e) {
    console.error("[quay] fb_posts save failed:", (e as Error).message);
    return false;
  }
}

/** GET — connection status + recent history. Never returns the token. */
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const cfg = getFbConfig();
  return NextResponse.json({ connected: !!cfg, pageId: cfg?.pageId ?? null, posts: await loadPosts() });
}

/**
 * POST — body:
 *   { action: "preview", productId, template? }                         → { link, commentText }
 *   { action: "publish", productId, message, addComment?, template? }   → publish Page post (+ first comment)
 *   { action: "comment", productId, post, template? }                    → comment on an existing post (URL or id)
 */
export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const action = String(body.action || "");
  const product = (await store.products.all()).find((p) => p.id === body.productId);
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const link = checkoutLink(siteUrl(), product.slug);
  const commentText = renderComment(typeof body.template === "string" ? body.template : undefined, {
    link,
    name: product.name,
    price: `$${product.price.toFixed(2)}`,
  });
  if (action === "preview") return NextResponse.json({ link, commentText });

  const cfg = getFbConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "Facebook Page not connected — copy the comment and paste it manually.", link, commentText, fallback: "copy" },
      { status: 409 }
    );
  }
  const now = new Date().toISOString();

  if (action === "publish") {
    const message = String(body.message || "").trim();
    if (!message) return NextResponse.json({ error: "Post text is required" }, { status: 400 });
    let postId: string;
    try {
      postId = (await publishPagePost(cfg, message.slice(0, 60000))).id;
    } catch (e) {
      return NextResponse.json({ error: friendlyGraphError(e), commentText }, { status: 502 });
    }
    const rec: FbPost = {
      id: uid("fbp_"), productId: product.id, postId, postUrl: postUrl(postId), message,
      commentText, status: "published", createdAt: now, updatedAt: now,
    };
    if (body.addComment !== false) {
      try {
        rec.commentId = (await commentOnPost(cfg, postId, commentText)).id;
        rec.status = "commented";
      } catch (e) {
        rec.status = "comment_failed";
        rec.error = friendlyGraphError(e);
      }
    }
    const saved = await record(rec);
    return NextResponse.json({ ...rec, saved });
  }

  if (action === "comment") {
    const postId = parsePostId(String(body.post || ""), cfg.pageId);
    if (!postId) {
      return NextResponse.json(
        {
          error:
            "Couldn't read a Page post id from that. Paste the post's link from your Page (…/posts/123…) or its numeric id. Group and personal-profile posts can't be commented via the API — use Copy instead.",
          commentText,
          fallback: "copy",
        },
        { status: 400 }
      );
    }
    const rec: FbPost = {
      id: uid("fbp_"), productId: product.id, postId, postUrl: postUrl(postId),
      commentText, status: "commented", createdAt: now, updatedAt: now,
    };
    try {
      rec.commentId = (await commentOnPost(cfg, postId, commentText)).id;
    } catch (e) {
      rec.status = "comment_failed";
      rec.error = friendlyGraphError(e);
    }
    const saved = await record(rec);
    return NextResponse.json({ ...rec, saved }, { status: rec.status === "commented" ? 200 : 502 });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
