(() => {
  var script = document.currentScript;
  var publicId = (script && script.getAttribute("data-widget-id")) || window.BEHAR_WIDGET_PUBLIC_ID || "";
  if (!publicId || !(publicId === "demo" || /^wdg_[a-zA-Z0-9_-]{12,80}$/.test(publicId))) return;

  var assetOrigin;
  try {
    assetOrigin = (script && script.getAttribute("data-origin")) || new URL(script.src).origin;
  } catch (_) {
    assetOrigin = window.location.origin;
  }

  var overlay;
  var frame;
  var previousBodyOverflow = "";
  var previousHtmlOverflow = "";

  function ensureModal() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.setAttribute("data-behar-widget-overlay", "");
    overlay.setAttribute("role", "presentation");
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483000",
      "display:none",
      "place-items:center",
      "padding:clamp(0px,2vw,24px)",
      "background:rgba(15,23,42,.48)",
      "backdrop-filter:blur(4px)",
      "-webkit-backdrop-filter:blur(4px)",
      "opacity:0",
      "transition:opacity .2s ease",
    ].join(";");
    frame = document.createElement("iframe");
    frame.title = "Demande de devis ou rendez-vous";
    frame.src =
      assetOrigin + "/widget/" + encodeURIComponent(publicId) + "/?host=" + encodeURIComponent(window.location.origin);
    frame.setAttribute("allow", "camera 'none'; microphone 'none'; geolocation 'none'");
    frame.style.cssText = [
      "display:block",
      "width:min(1180px,100%)",
      "height:min(90vh,920px)",
      "min-height:min(90vh,680px)",
      "border:0",
      "border-radius:22px",
      "background:#fff",
      "box-shadow:0 32px 100px rgba(15,23,42,.3)",
      "transform:translateY(10px) scale(.985)",
      "transition:transform .24s ease",
    ].join(";");
    overlay.appendChild(frame);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay && frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: "behar.widget.request-close", widgetPublicId: publicId }, assetOrigin);
      }
    });
    document.body.appendChild(overlay);
  }

  function open() {
    ensureModal();
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    overlay.style.display = "grid";
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      frame.style.transform = "translateY(0) scale(1)";
      frame.focus();
    });
  }

  function close() {
    if (!overlay || overlay.style.display === "none") return;
    overlay.style.opacity = "0";
    frame.style.transform = "translateY(10px) scale(.985)";
    window.setTimeout(() => {
      overlay.style.display = "none";
    }, 210);
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overflow = previousHtmlOverflow;
  }

  function bindTriggers() {
    var triggers = document.querySelectorAll("[data-behar-widget-open], [href='#behar-widget']");
    for (let index = 0; index < triggers.length; index += 1) {
      triggers[index].addEventListener("click", (event) => {
        event.preventDefault();
        open();
      });
    }
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== assetOrigin || !event.data || event.data.source !== "behar-widget") return;
    if (event.data.widgetPublicId !== publicId) return;
    if (event.data.type === "behar.widget.close") close();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay && overlay.style.display !== "none" && frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: "behar.widget.request-close", widgetPublicId: publicId }, assetOrigin);
    }
  });

  window.BeharWidget = Object.assign(window.BeharWidget || {}, { open: open, close: close });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindTriggers, { once: true });
  else bindTriggers();
})();
