// background.js
importScripts("call.js");

const RULE_ID_HTTP = 1001;
const RULE_ID_WS   = 1002;

const TOAST_TITLE = "Asterisk Click 2 Call";
const TOAST_ICON  = "phone48.png"; // must exist in your extension package

function originFrom(base) {
  try {
    const u = new URL(base);
    return u.protocol + "//" + u.host + "/"; // e.g. https://1.2.3.4:8088/
  } catch (e) {
    return null;
  }
}

// Mirror call.js behaviour so DNR matches real requests
function sanitizeURL(url, allowHttp) {
  if (!url) return url;
  if (url.indexOf("http://") === 0 && !allowHttp) {
    return url.replace("http://", "https://");
  }
  return url;
}

function showToast(message) {
  try {
    chrome.notifications.create({
      type: "basic",
      title: TOAST_TITLE,
      message: message,
      iconUrl: TOAST_ICON
    });
  } catch (e) {
    // notifications can fail silently on some setups; don't break calling flow
  }
}

// Defensive sanitiser for tel:/callto: payloads
function sanitizeDialString(raw) {
  if (!raw) return "";

  var s = String(raw);

  // Handle cases where the content script accidentally forwards the full href
  s = s.replace(/^(tel:|callto:)/i, "");

  // Drop params/fragments/extensions like ?foo=, #bar, ;ext=123
  s = s.split(/[?#;]/)[0];

  try { s = decodeURIComponent(s); } catch (e) { /* ignore */ }

  s = s.trim();

  // Allow digits plus a few dialling chars (+ * #)
  s = s.replace(/[^0-9+*#]/g, "");

  // Only allow a single '+' and only at the start
  if (s.charAt(0) === "+") {
    s = "+" + s.slice(1).replace(/\+/g, "");
  } else {
    s = s.replace(/\+/g, "");
  }

  // Optional: clamp length to something sane
  if (s.length > 32) s = s.slice(0, 32);

  return s;
}

async function installHttpRule(httpOrigin) {
  if (!httpOrigin) return;
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID_HTTP],
    addRules: [{
      id: RULE_ID_HTTP,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
          { header: "Access-Control-Allow-Private-Network", operation: "set", value: "true" }
        ]
      },
      condition: {
        urlFilter: httpOrigin,
        resourceTypes: ["xmlhttprequest", "fetch", "other"] // include preflight
      }
    }]
  });
}

async function installWsRule(wsOrigin) {
  if (!wsOrigin) return;
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID_WS],
    addRules: [{
      id: RULE_ID_WS,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
          { header: "Access-Control-Allow-Private-Network", operation: "set", value: "true" }
        ]
      },
      condition: {
        urlFilter: wsOrigin,
        resourceTypes: ["websocket"]
      }
    }]
  });
}

async function applyRulesFromStorage() {
  try {
    const stored = await chrome.storage.sync.get(["ip", "allowHttp"]);
    const ip = stored.ip;
    const allowHttp = stored.allowHttp;

    const base = sanitizeURL(ip || "", allowHttp);
    const httpOrigin = originFrom(base);
    if (!httpOrigin) return;

    // permissions.contains expects match patterns like https://host/*
    const permPattern = httpOrigin + "*";

    // Only install rules if we already have host access for that origin (granted in Options UI)
    const hasPerm = await chrome.permissions.contains({ origins: [permPattern] });
    if (!hasPerm) {
      console.warn("Missing origin permission - DNR not installed yet.");
      return;
    }

    await installHttpRule(httpOrigin);

    // WS origin is just http(s) swapped to ws(s)
    const wsOrigin = httpOrigin.replace(/^http/, "ws");
    await installWsRule(wsOrigin);
  } catch (e) {
    console.warn("Failed applying DNR rules:", e);
  }
}

chrome.runtime.onInstalled.addListener(function () { applyRulesFromStorage(); });
chrome.runtime.onStartup.addListener(function () { applyRulesFromStorage(); });

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === "sync" && (changes.ip || changes.allowHttp)) {
    applyRulesFromStorage();
  }
});

// Handle messages from content script for tel:/callto: link clicks
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (!request || request.action !== "clickToCall") return;

  var cleanNumber = sanitizeDialString(request.phoneNumber);

  if (!cleanNumber) {
    showToast("Invalid phone number.");
    sendResponse({ success: false, message: "Invalid phone number" });
    return;
  }

  // Immediate user feedback (call.js may also show a success toast later)
  showToast("Calling " + cleanNumber + "\u2026");

  try {
    placeCall(cleanNumber);
    sendResponse({ success: true, message: "Call started" });
  } catch (e) {
    showToast("Failed to start call.");
    sendResponse({ success: false, message: "Failed to start call" });
  }
});
