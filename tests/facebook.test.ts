import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutLink, commentOnPost, friendlyGraphError, getFbConfig, GraphError,
  parsePostId, publishPagePost, renderComment,
} from "../lib/facebook";

const cfg = { pageId: "111", token: "TOKEN", version: "v21.0" };

test("getFbConfig requires page id + token", () => {
  assert.equal(getFbConfig({}), null);
  assert.equal(getFbConfig({ FB_PAGE_ID: "1" }), null);
  assert.deepEqual(getFbConfig({ FB_PAGE_ID: "1", FB_PAGE_ACCESS_TOKEN: "t", FB_GRAPH_VERSION: "bad" }), { pageId: "1", token: "t", version: "v21.0" });
});

test("checkoutLink builds tagged product URL", () => {
  assert.equal(checkoutLink("https://sellonquay.com/", "my kit"),
    "https://sellonquay.com/product/my%20kit?utm_source=facebook&utm_medium=comment&utm_campaign=fb_first_comment");
});

test("renderComment fills vars and always includes the link", () => {
  assert.equal(renderComment(undefined, { link: "L" }), "Shop it here 👉 L");
  assert.equal(renderComment("Get {name} for {price}: {link}", { link: "L", name: "Kit", price: "$5.00" }), "Get Kit for $5.00: L");
  assert.equal(renderComment("Buy now!", { link: "L" }), "Buy now! L");
});

test("parsePostId handles ids and Page URLs, rejects groups", () => {
  assert.equal(parsePostId("111_222"), "111_222");
  assert.equal(parsePostId("222", "111"), "111_222");
  assert.equal(parsePostId("222"), null);
  assert.equal(parsePostId("https://www.facebook.com/mypage/posts/333", "111"), "111_333");
  assert.equal(parsePostId("https://www.facebook.com/permalink.php?story_fbid=444&id=555"), "555_444");
  assert.equal(parsePostId("https://m.facebook.com/photo.php?fbid=666", "111"), "111_666");
  assert.equal(parsePostId("https://www.facebook.com/groups/9/posts/10", "111"), null);
  assert.equal(parsePostId("https://evil.com/posts/1", "111"), null);
  assert.equal(parsePostId("not a url", "111"), null);
});

function mockFetch(status: number, json: unknown, calls: { url: string; body: string }[] = []) {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, body: String(init?.body) });
    return new Response(JSON.stringify(json), { status });
  }) as unknown as typeof fetch;
}

test("commentOnPost posts to /{post-id}/comments with page token", async () => {
  const calls: { url: string; body: string }[] = [];
  const r = await commentOnPost(cfg, "111_222", "hi L", mockFetch(200, { id: "c1" }, calls));
  assert.equal(r.id, "c1");
  assert.equal(calls[0].url, "https://graph.facebook.com/v21.0/111_222/comments");
  const b = new URLSearchParams(calls[0].body);
  assert.equal(b.get("message"), "hi L");
  assert.equal(b.get("access_token"), "TOKEN");
});

test("publishPagePost posts to page feed", async () => {
  const calls: { url: string; body: string }[] = [];
  await publishPagePost(cfg, "hello", undefined, mockFetch(200, { id: "111_9" }, calls));
  assert.equal(calls[0].url, "https://graph.facebook.com/v21.0/111/feed");
});

test("Graph errors surface as friendly messages", async () => {
  await assert.rejects(
    commentOnPost(cfg, "111_222", "x", mockFetch(400, { error: { message: "perm", code: 200 } })),
    (e: unknown) => e instanceof GraphError && /pages_manage_engagement/.test(friendlyGraphError(e))
  );
  await assert.rejects(commentOnPost(cfg, "../me", "x", mockFetch(200, { id: "x" })), GraphError);
  assert.match(friendlyGraphError(new GraphError("x", 190)), /expired/);
  assert.match(friendlyGraphError(new Error("ECONNRESET")), /Couldn't reach/);
});
