/**
 * Facebook Page helpers: publish a Page post and drop the product's checkout
 * link as the first comment (Graph API POST /{post-id}/comments).
 *
 * Setup (env vars, server-side only — never exposed to the browser):
 *   FB_PAGE_ID            numeric id of your Facebook Page
 *   FB_PAGE_ACCESS_TOKEN  a long-lived *Page* access token with
 *                         pages_manage_posts, pages_manage_engagement,
 *                         pages_read_engagement (and pages_show_list)
 *   FB_GRAPH_VERSION      optional, defaults to v21.0
 *
 * Without these, the dashboard falls back to copy-to-clipboard. Personal
 * profiles and Groups can't be commented on via the API — copy/paste there.
 *
 * This module is pure (no store / Next imports) so it can be unit tested with
 * an injected fetch.
 */

export const DEFAULT_COMMENT_TEMPLATE = "Shop it here 👉 {link}";

export interface FbConfig {
  pageId: string;
  token: string;
  version: string;
}

export function getFbConfig(env: Record<string, string | undefined> = process.env): FbConfig | null {
  const pageId = (env.FB_PAGE_ID || "").trim();
  const token = (env.FB_PAGE_ACCESS_TOKEN || "").trim();
  if (!pageId || !token) return null;
  const version = (env.FB_GRAPH_VERSION || "v21.0").trim();
  return { pageId, token, version: /^v\d+\.\d+$/.test(version) ? version : "v21.0" };
}

/** Product checkout link, tagged so FB-comment sales show up in analytics. */
export function checkoutLink(baseUrl: string, slug: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/product/${encodeURIComponent(slug)}?utm_source=facebook&utm_medium=comment&utm_campaign=fb_first_comment`;
}

/** Fill a comment template. Supports {link}, {name}, {price}. Appends the link if the template forgot it. */
export function renderComment(
  template: string | undefined,
  vars: { link: string; name?: string; price?: string }
): string {
  const t = (template && template.trim()) || DEFAULT_COMMENT_TEMPLATE;
  let out = t
    .replace(/\{link\}/g, vars.link)
    .replace(/\{name\}/g, vars.name ?? "")
    .replace(/\{price\}/g, vars.price ?? "");
  if (!out.includes(vars.link)) out = `${out.trim()} ${vars.link}`;
  return out.slice(0, 8000);
}

/**
 * Turn a pasted Facebook post URL or id into a Graph post id ("{pageId}_{postId}").
 * Returns null for things we can't resolve (e.g. pfbid share links, group/profile posts).
 */
export function parsePostId(input: string, pageId?: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;
  if (/^\d+_\d+$/.test(s)) return s;
  if (/^\d+$/.test(s)) return pageId ? `${pageId}_${s}` : null;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (!/(^|\.)facebook\.com$|(^|\.)fb\.com$/.test(url.hostname)) return null;
  if (/\/groups\//.test(url.pathname)) return null;
  const storyFbid = url.searchParams.get("story_fbid");
  const id = url.searchParams.get("id");
  if (storyFbid && /^\d+$/.test(storyFbid)) {
    if (id && /^\d+$/.test(id)) return `${id}_${storyFbid}`;
    return pageId ? `${pageId}_${storyFbid}` : null;
  }
  const fbid = url.searchParams.get("fbid");
  if (fbid && /^\d+$/.test(fbid)) return pageId ? `${pageId}_${fbid}` : null;
  const m = url.pathname.match(/\/(?:posts|videos|photos|reel)\/(?:[^/]+\/)?(\d+)\/?$/);
  if (m) return pageId ? `${pageId}_${m[1]}` : null;
  return null;
}

export class GraphError extends Error {
  constructor(message: string, public code?: number, public status?: number) {
    super(message);
  }
}

/** Human-friendly explanation for common Graph errors. */
export function friendlyGraphError(e: unknown): string {
  if (e instanceof GraphError) {
    if (e.code === 190) return "Facebook token expired or invalid — generate a new Page access token (FB_PAGE_ACCESS_TOKEN).";
    if (e.code === 10 || e.code === 200 || e.code === 3)
      return "Missing permission — the Page token needs pages_manage_engagement + pages_read_engagement (and pages_manage_posts to publish).";
    if (e.code === 100) return `Facebook couldn't find that post (or it's not on your Page): ${e.message}`;
    if (e.code === 4 || e.code === 17 || e.code === 32 || e.code === 613) return "Facebook rate limit hit — try again in a few minutes.";
    return `Facebook error: ${e.message}`;
  }
  return `Couldn't reach Facebook: ${e instanceof Error ? e.message : String(e)}`;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

async function graphPost(
  cfg: FbConfig,
  path: string,
  params: Record<string, string>,
  fetchImpl: FetchLike = fetch
): Promise<{ id: string }> {
  const body = new URLSearchParams({ ...params, access_token: cfg.token });
  const res = await fetchImpl(`https://graph.facebook.com/${cfg.version}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  let json: { id?: string; error?: { message?: string; code?: number } } = {};
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok || json.error || !json.id) {
    throw new GraphError(json.error?.message || `HTTP ${res.status}`, json.error?.code, res.status);
  }
  return { id: json.id };
}

/** Publish a text (+ optional link) post to the Page feed. */
export function publishPagePost(cfg: FbConfig, message: string, link?: string, fetchImpl?: FetchLike) {
  const params: Record<string, string> = { message };
  if (link) params.link = link;
  return graphPost(cfg, `${encodeURIComponent(cfg.pageId)}/feed`, params, fetchImpl);
}

/** Add a comment to a post as the Page. */
export async function commentOnPost(cfg: FbConfig, postId: string, message: string, fetchImpl?: FetchLike) {
  if (!/^\d+(_\d+)?$/.test(postId)) throw new GraphError("Invalid post id", 100);
  return graphPost(cfg, `${postId}/comments`, { message }, fetchImpl);
}

export function postUrl(postId: string): string {
  const [page, post] = postId.split("_");
  return post ? `https://www.facebook.com/${page}/posts/${post}` : `https://www.facebook.com/${postId}`;
}
