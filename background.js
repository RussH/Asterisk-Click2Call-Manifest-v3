// background.js
importScripts("call.js");

const RULE_ID_HTTP = 1001;
const RULE_ID_WS   = 1002;

function originFrom(base) {
  try { const u = new URL(base); return `${u.protocol}//${u.host}/`; }
  catch { return null; }
}

// Mirror call.js behaviour so DNR matches real requests
function sanitizeURL(url, allowHttp) {
  if (!url) return url;
  if (url.startsWith("http://") && !allowHttp) {
    return url.replace("http://", "https://");
  }
  return url;
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
  const { ip, allowHttp } = await chrome.storage.sync.get(["ip", "allowHttp"]);
  const base = sanitizeURL(ip || "", allowHttp);
  const httpOrigin = originFrom(base);
  if (!httpOrigin) return;

  // Only install rules if we already have host access for that origin (granted in Options UI)
  const hasPerm = await chrome.permissions.contains({ origins: [httpOrigin] });
  if (!hasPerm) {
    console.warn("Missing origin permission for", httpOrigin, "- DNR not installed yet.");
    return;
  }

  await installHttpRule(httpOrigin);

  // WS origin is just http(s) swapped to ws(s)
  const wsOrigin = httpOrigin.replace(/^http/, "ws");
  await installWsRule(wsOrigin);
}

chrome.runtime.onInstalled.addListener(applyRulesFromStorage);
chrome.runtime.onStartup.addListener(applyRulesFromStorage);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.ip || changes.allowHttp)) {
    applyRulesFromStorage();
  }
});

// Handle messages from content script for tel:/callto: link clicks
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'clickToCall' && request.phoneNumber) {
    console.log('Background: Received clickToCall request for:', request.phoneNumber);

    placeCall(request.phoneNumber);

    sendResponse({ success: true });
  }

  return true;
});
