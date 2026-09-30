/**
 * Quay embeddable buy buttons — vanilla JS, zero dependencies.
 *
 * Usage (paste on any website, blog, or link-in-bio page):
 *   <script src="https://YOUR-QUAY-SITE/quay-embed.js"
 *           data-product="your-product-slug"
 *           data-label="Buy now"></script>
 *
 * Renders a styled "Buy now" button where the script tag sits; clicking it
 * opens your Quay checkout in a modal iframe. Multiple buttons per page are
 * fine — one script tag per product.
 */
(function () {
  "use strict";

  var scripts = document.querySelectorAll('script[data-product][src*="quay-embed.js"]');
  if (!scripts.length) return;

  var CSS = [
    ".quay-embed-btn{font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:16px;",
    "color:#fff;background:#FF4D00;border:3px solid #141210;border-radius:14px;padding:14px 26px;",
    "cursor:pointer;box-shadow:4px 4px 0 #141210;transition:transform .12s ease,box-shadow .12s ease;}",
    ".quay-embed-btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #141210;}",
    ".quay-embed-btn:active{transform:translate(2px,2px);box-shadow:0 0 0 #141210;}",
    ".quay-embed-overlay{position:fixed;inset:0;background:rgba(20,18,16,.65);z-index:2147483647;",
    "display:flex;align-items:center;justify-content:center;padding:20px;}",
    ".quay-embed-modal{position:relative;width:min(560px,100%);height:min(760px,92vh);",
    "background:#FAF6EE;border:3px solid #141210;border-radius:18px;overflow:hidden;box-shadow:8px 8px 0 #141210;}",
    ".quay-embed-modal iframe{width:100%;height:100%;border:0;display:block;}",
    ".quay-embed-close{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;",
    "border:2px solid #141210;background:#fff;font-size:16px;font-weight:700;cursor:pointer;line-height:1;z-index:2;}"
  ].join("");

  function injectCss() {
    if (document.getElementById("quay-embed-css")) return;
    var s = document.createElement("style");
    s.id = "quay-embed-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function openModal(checkoutUrl) {
    closeModal();
    var overlay = document.createElement("div");
    overlay.className = "quay-embed-overlay";
    overlay.id = "quay-embed-overlay";
    var modal = document.createElement("div");
    modal.className = "quay-embed-modal";
    var close = document.createElement("button");
    close.className = "quay-embed-close";
    close.textContent = "✕";
    close.setAttribute("aria-label", "Close checkout");
    close.onclick = closeModal;
    var frame = document.createElement("iframe");
    frame.src = checkoutUrl;
    frame.setAttribute("title", "Secure checkout");
    frame.setAttribute("allow", "payment");
    modal.appendChild(close);
    modal.appendChild(frame);
    overlay.appendChild(modal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
    document.addEventListener("keydown", escClose);
  }

  function escClose(e) {
    if (e.key === "Escape") closeModal();
  }

  function closeModal() {
    var o = document.getElementById("quay-embed-overlay");
    if (o && o.parentNode) o.parentNode.removeChild(o);
    document.removeEventListener("keydown", escClose);
  }

  injectCss();

  Array.prototype.forEach.call(scripts, function (tag) {
    var slug = (tag.getAttribute("data-product") || "").trim();
    if (!slug) return;
    var src = tag.getAttribute("src") || "";
    var origin = src.split("/quay-embed.js")[0];
    var label = tag.getAttribute("data-label") || "Buy now";
    var checkoutUrl = origin + "/embed/checkout/" + encodeURIComponent(slug);

    var btn = document.createElement("button");
    btn.className = "quay-embed-btn";
    btn.type = "button";
    btn.textContent = label;
    btn.onclick = function () { openModal(checkoutUrl); };
    tag.parentNode.insertBefore(btn, tag.nextSibling);
  });
})();
