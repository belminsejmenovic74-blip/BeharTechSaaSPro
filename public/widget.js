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
  var lastFrameUrl = "";

  function widgetUrl(selection) {
    var url = new URL(`${assetOrigin}/widget/${encodeURIComponent(publicId)}/`);
    url.searchParams.set("host", window.location.origin);
    if (selection) {
      if (selection.type) url.searchParams.set("type", selection.type);
      if (selection.brand) url.searchParams.set("brand", selection.brand);
      if (selection.model) url.searchParams.set("model", selection.model);
    }
    return url.toString();
  }

  function ensureModal(selection) {
    if (overlay) {
      if (selection) {
        lastFrameUrl = widgetUrl(selection);
        frame.src = lastFrameUrl;
      }
      return;
    }
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
      "background:rgba(20,24,28,.24)",
      "backdrop-filter:blur(16px)",
      "-webkit-backdrop-filter:blur(16px)",
      "opacity:0",
      "transition:opacity .2s ease",
    ].join(";");
    frame = document.createElement("iframe");
    frame.title = "Demande de devis ou rendez-vous";
    lastFrameUrl = widgetUrl(selection);
    frame.src = lastFrameUrl;
    frame.setAttribute("allow", "camera 'none'; microphone 'none'; geolocation 'none'");
    frame.style.cssText = [
      "display:block",
      "width:min(1380px,100%)",
      "height:calc(100dvh - clamp(0px,4vw,48px))",
      "max-height:calc(100dvh - clamp(0px,4vw,48px))",
      "border:0",
      "border-radius:28px",
      "background:transparent",
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

  function open(selection) {
    ensureModal(selection);
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
        var trigger = event.currentTarget;
        open({
          type: trigger.getAttribute("data-device-type") || "",
          brand: trigger.getAttribute("data-device-brand") || "",
          model: trigger.getAttribute("data-device-model") || "",
        });
      });
    }
  }

  function publicRequest(path, token, query) {
    var normalizedPath = path.endsWith("/") ? path : `${path}/`;
    var url = new URL(`${assetOrigin}/api/public/widgets/${encodeURIComponent(publicId)}${normalizedPath}`);
    if (query) {
      Object.keys(query).forEach((key) => {
        if (query[key]) url.searchParams.set(key, query[key]);
      });
    }
    var headers = { "x-behar-host-origin": window.location.origin };
    if (token) headers["x-widget-token"] = token;
    return fetch(url.toString(), { headers: headers, credentials: "omit", cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("widget_search_unavailable");
      return response.json().then((payload) => payload.data);
    });
  }

  function fillSelect(select, values, placeholder, otherLabel) {
    var other;
    select.innerHTML = "";
    var empty = document.createElement("option");
    empty.value = "";
    empty.textContent = placeholder;
    select.appendChild(empty);
    values.forEach((value) => {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    if (otherLabel) {
      other = document.createElement("option");
      other.value = "__other__";
      other.textContent = otherLabel;
      select.appendChild(other);
    }
    select.disabled = false;
  }

  function renderSearch(host, index) {
    if (host.getAttribute("data-behar-search-ready") === "true") return;
    host.setAttribute("data-behar-search-ready", "true");
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var prefix = `behar-search-${index}`;
    root.innerHTML = [
      "<style>",
      ':host{display:block;width:100%;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1A1916}',
      "*{box-sizing:border-box}",
      ".search{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(280px,.92fr);align-items:stretch;width:100%;max-width:1380px;margin:0 auto;border:1px solid #E1E5E9;border-radius:22px;background:#fff;box-shadow:0 14px 38px rgba(20,24,28,.10);overflow:hidden}",
      ".field{min-width:0;padding:18px 24px;border-right:1px solid #E8E8E5}",
      "label{display:block;margin:0 0 5px;color:#87919E;font-size:13px;font-weight:650;line-height:1.25}",
      "select{display:block;width:100%;min-height:34px;border:0;background:#fff;color:#152231;font:inherit;font-size:18px;font-weight:700;line-height:1.25;outline:none;cursor:pointer}",
      "select:disabled{cursor:not-allowed;color:#A7AFB8}",
      "select:focus-visible{border-radius:8px;box-shadow:0 0 0 3px rgba(42,157,143,.18)}",
      ".custom{display:block;width:100%;min-height:34px;border:0;background:#fff;color:#152231;font:inherit;font-size:18px;font-weight:700;line-height:1.25;outline:none}",
      ".custom:focus-visible{border-radius:8px;box-shadow:0 0 0 3px rgba(42,157,143,.18)}",
      "[hidden]{display:none!important}",
      ".submit{align-self:stretch;margin:10px;border:0;border-radius:16px;background:#102131;color:#fff;padding:16px 22px;font:inherit;font-size:16px;font-weight:750;line-height:1.25;cursor:pointer;transition:transform .15s ease,background .15s ease,opacity .15s ease}",
      ".submit:hover:not(:disabled){background:#183246;transform:translateY(-1px)}",
      ".submit:focus-visible{outline:3px solid rgba(42,157,143,.32);outline-offset:2px}",
      ".submit:disabled{cursor:not-allowed;opacity:.46}",
      ".status{display:none;grid-column:1/-1;margin:0;padding:0 24px 14px;color:#6B6B6B;font-size:12px}",
      ".status[data-visible=true]{display:block}",
      "@media(max-width:820px){.search{grid-template-columns:1fr;border-radius:18px}.field{padding:15px 18px;border-right:0;border-bottom:1px solid #E8E8E5}.submit{min-height:56px;margin:12px;font-size:15px}.status{padding:0 18px 14px}}",
      "</style>",
      '<form class="search" novalidate>',
      `<div class="field"><label for="${prefix}-type">Quel appareil ?</label><select id="${prefix}-type" aria-label="Quel appareil ?" disabled><option>Chargement…</option></select></div>`,
      `<div class="field"><label for="${prefix}-brand">Quelle marque ?</label><select id="${prefix}-brand" aria-label="Quelle marque ?" disabled><option value="">Choisissez d’abord un appareil</option></select><input class="custom custom-brand" aria-label="Autre marque" placeholder="Saisissez la marque" hidden /></div>`,
      `<div class="field"><label for="${prefix}-model">Quel modèle ?</label><select id="${prefix}-model" aria-label="Quel modèle ?" disabled><option value="">Choisissez d’abord une marque</option></select><input class="custom custom-model" aria-label="Autre modèle" placeholder="Saisissez le modèle" hidden /></div>`,
      '<button class="submit" type="submit" disabled>Voir les réparations et les prix</button>',
      '<p class="status" role="status"></p>',
      "</form>",
    ].join("");

    var form = root.querySelector("form");
    var typeSelect = root.querySelector("select[id$='-type']");
    var brandSelect = root.querySelector("select[id$='-brand']");
    var modelSelect = root.querySelector("select[id$='-model']");
    var brandInput = root.querySelector(".custom-brand");
    var modelInput = root.querySelector(".custom-model");
    var submit = root.querySelector(".submit");
    var status = root.querySelector(".status");
    var sessionToken = "";

    function showStatus(message) {
      status.textContent = message || "";
      status.setAttribute("data-visible", message ? "true" : "false");
    }

    function chosenBrand() {
      return brandSelect.value === "__other__" ? brandInput.value.trim() : brandSelect.value;
    }

    function chosenModel() {
      return modelSelect.value === "__other__" || modelSelect.hidden ? modelInput.value.trim() : modelSelect.value;
    }

    function updateSubmit() {
      submit.disabled = !typeSelect.value || !chosenBrand() || !chosenModel();
    }

    function showCustomModel(show) {
      modelSelect.hidden = false;
      modelInput.hidden = !show;
      if (show) modelInput.disabled = false;
      updateSubmit();
    }

    publicRequest("/config")
      .then((config) => {
        sessionToken = config.sessionToken;
        return publicRequest("/categories", sessionToken);
      })
      .then((result) => {
        fillSelect(typeSelect, result.categories || [], "Choisissez un appareil");
        if (!result.categories || !result.categories.length)
          showStatus("Aucun appareil n’est disponible pour le moment.");
      })
      .catch(() => {
        typeSelect.innerHTML = '<option value="">Recherche indisponible</option>';
        showStatus(
          "La recherche est momentanément indisponible. Vous pouvez toujours ouvrir le widget avec le bouton habituel.",
        );
      });

    typeSelect.addEventListener("change", () => {
      fillSelect(brandSelect, [], "Chargement des marques…");
      brandSelect.disabled = true;
      brandSelect.hidden = false;
      brandInput.hidden = true;
      brandInput.value = "";
      fillSelect(modelSelect, [], "Choisissez d’abord une marque");
      modelSelect.disabled = true;
      modelSelect.hidden = false;
      modelInput.hidden = true;
      modelInput.value = "";
      submit.disabled = true;
      showStatus("");
      if (!typeSelect.value) return;
      publicRequest("/brands", sessionToken, { category: typeSelect.value })
        .then((result) => fillSelect(brandSelect, result.brands || [], "Choisissez une marque", "Autre marque"))
        .catch(() => showStatus("Impossible de charger les marques. Réessayez dans un instant."));
    });

    brandSelect.addEventListener("change", () => {
      var customBrand = brandSelect.value === "__other__";
      brandSelect.hidden = false;
      brandInput.hidden = !customBrand;
      fillSelect(modelSelect, [], "Chargement des modèles…");
      modelSelect.disabled = true;
      modelSelect.hidden = customBrand;
      modelInput.hidden = !customBrand;
      modelInput.value = "";
      submit.disabled = true;
      showStatus("");
      if (customBrand) {
        modelInput.disabled = false;
        brandInput.focus();
        return;
      }
      if (!brandSelect.value) return;
      publicRequest("/models", sessionToken, { category: typeSelect.value, brand: brandSelect.value })
        .then((result) => {
          fillSelect(modelSelect, result.models || [], "Choisissez un modèle", "Autre modèle");
          if (!result.models?.length) {
            modelSelect.value = "__other__";
            showCustomModel(true);
          }
        })
        .catch(() => showStatus("Impossible de charger les modèles. Réessayez dans un instant."));
    });

    modelSelect.addEventListener("change", () => {
      showCustomModel(modelSelect.value === "__other__");
    });

    brandInput.addEventListener("input", updateSubmit);
    modelInput.addEventListener("input", updateSubmit);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      var brand = chosenBrand();
      var model = chosenModel();
      if (!typeSelect.value || !brand || !model) return;
      open({ type: typeSelect.value, brand: brand, model: model });
    });
  }

  function initSearches() {
    var hosts = document.querySelectorAll("[data-behar-widget-search]");
    var index;
    for (index = 0; index < hosts.length; index += 1) renderSearch(hosts[index], index);
  }

  function observeSearches() {
    if (typeof MutationObserver === "undefined" || !document.documentElement) return;
    var queued = false;
    var observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        initSearches();
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
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

  window.BeharWidget = Object.assign(window.BeharWidget || {}, { open: open, close: close, refresh: initSearches });
  observeSearches();
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        bindTriggers();
        initSearches();
      },
      { once: true },
    );
  } else {
    bindTriggers();
    initSearches();
  }
})();
