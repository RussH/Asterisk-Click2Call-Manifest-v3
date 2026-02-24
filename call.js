// call.js

function openOptionsPage() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    // Fallback (older Chrome) - service worker doesn't have window, but this is here for completeness
    // In MV3 service worker context, openOptionsPage should exist.
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  }
}

function init() {
  console.log("Initializing Click to Call extension.");

  // Load settings from chrome.storage including username, secret, and exten.
  chrome.storage.sync.get(
    ["context", "replchar", "interface", "ip", "username", "secret", "exten", "allowHttp"],
    function (settings) {
      opt.context   = settings.context || "default"; // Default context if not set
      opt.replchar  = settings.replchar || "";
      opt.interface = settings.interface || "ari"; // Default to ARI
      opt.ip        = sanitizeURL(settings.ip || "https://127.0.0.1:8088", settings.allowHttp);
      opt.username  = settings.username || "";
      opt.secret    = settings.secret || "";
      opt.exten     = settings.exten || "";
      opt.allowHttp = settings.allowHttp || false;

      console.log("Settings loaded.");
    }
  );

  // Remove existing context menu items to avoid duplicate creation.
  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create(
      {
        id: "click2call",
        title: "Call: %s", // Dynamically shows the selected text
        contexts: ["selection"]
      },
      function () {
        if (chrome.runtime.lastError) {
          console.error("Error creating context menu:", chrome.runtime.lastError.message);
        } else {
          console.log("Context menu registered.");
        }
      }
    );
  });

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId !== "click2call") return;

    var selectedText = info.selectionText || "";
    selectedText = selectedText.trim();

    if (selectedText) {
      placeCall(selectedText);
    } else {
      console.error("No text selected.");
      notify("Asterisk Click to Call", "No phone number selected.");
    }
  });
}

function sanitizeURL(ip, allowHttp) {
  if (ip && ip.indexOf("http://") === 0 && !allowHttp) {
    console.warn("Insecure HTTP connection detected; forcing HTTPS.");
    return ip.replace("http://", "https://");
  }
  return ip;
}

function notify(title, message) {
  try {
    chrome.notifications.create({
      type: "basic",
      title: title,
      message: message,
      iconUrl: "phone48.png"
    });
  } catch (e) {
    // ignore
  }
}

function placeCall(phoneNumber) {
  chrome.storage.sync.get(
    ["context", "replchar", "interface", "ip", "username", "secret", "exten", "allowHttp"],
    function (settings) {
      opt.context   = settings.context || "default";
      opt.replchar  = settings.replchar || "";
      opt.interface = settings.interface || "ari";
      opt.ip        = sanitizeURL(settings.ip || "https://127.0.0.1:8088", settings.allowHttp);
      opt.username  = settings.username || "";
      opt.secret    = settings.secret || "";
      opt.exten     = settings.exten || "";
      opt.allowHttp = settings.allowHttp || false;

      if (!opt.exten || !opt.ip || !opt.context || !opt.username || !opt.secret) {
        console.error("Missing required ARI configuration.");
        notify("Asterisk Click to Call", "Missing ARI settings. Opening options…");
        openOptionsPage();
        return;
      }

      makePhoneCall(phoneNumber);
    }
  );
}

function makePhoneCall(phoneNumber) {
  if (!opt.exten || !opt.ip || !opt.context || !opt.username || !opt.secret) {
    console.error("Missing required ARI configuration.");
    notify("Asterisk Click to Call", "Missing ARI settings. Opening options…");
    openOptionsPage();
    return;
  }

  if (opt.ip.indexOf("http://") === 0 && !opt.allowHttp) {
    console.error("HTTP connections are not allowed. Open options to enable.");
    notify("Asterisk Click to Call", "HTTP is disabled. Enable it in Options to use http:// ARI.");
    return;
  }

  // Keep only digits for the dialled number (matches your existing behaviour)
  var sanitizedPhone = String(phoneNumber).replace(/\D/g, "");

  if (!sanitizedPhone) {
    notify("Asterisk Click to Call", "Invalid phone number.");
    return;
  }

  // Build URL safely (encode query parts)
  var url =
  opt.ip +
  "/ari/channels?endpoint=" + encodeURIComponent("Local/" + opt.exten + "@" + opt.context) +
  "&extension=" + encodeURIComponent(sanitizedPhone) +
  "&callerId=" + encodeURIComponent(sanitizedPhone) +
  "&timeout=15" +
  "&context=" + encodeURIComponent(opt.context) +
  "&api_key=" + encodeURIComponent(opt.username + ":" + opt.secret);

  httpSend("POST", url, "Call initiated: " + sanitizedPhone);
}

function httpSend(method, url, message) {
  fetch(url, { method: method })
  .then(function (response) {
    if (response.ok) {
      notify("Asterisk Click to Call", message);
    } else {
      console.error("Error initiating call:", response.status, response.statusText);
      notify("Asterisk Click to Call", "Call failed (" + response.status + ").");
    }
  })
  .catch(function (error) {
    console.error("Error sending HTTP request:", error);
    notify("Asterisk Click to Call", "Call failed (network error).");
  });
}

var opt = {}; // Global options object

init();
