function openOptionsPage() {
  chrome.runtime.openOptionsPage
  ? chrome.runtime.openOptionsPage()
  : window.open(chrome.runtime.getURL("options.html"));
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

      console.log("Settings loaded:", opt);
    }
  );

  // Remove existing context menu items to avoid duplicate creation.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: "click2call",
        title: "Call: %s", // Dynamically shows the selected text
        contexts: ["selection"],
      },
      function () {
        if (chrome.runtime.lastError) {
          console.error("Error creating context menu:", chrome.runtime.lastError);
        } else {
          console.log("Context menu registered.");
        }
      }
    );
  });

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener(function (info, tab) {
    console.log("Context menu click detected:", info);
    if (info.menuItemId === "click2call") {
      const selectedText = info.selectionText;
      console.log("Selected text:", selectedText);
      if (selectedText) {
        placeCall(selectedText.trim());
      } else {
        console.error("No text selected.");
      }
    }
  });
}

function sanitizeURL(ip, allowHttp) {
  if (ip.startsWith("http://") && !allowHttp) {
    console.warn("Insecure HTTP connection detected and blocked.");
    return ip.replace("http://", "https://"); // Force HTTPS if HTTP is disallowed
  }
  return ip;
}

function placeCall(phoneNumber) {
  console.log("placeCall() invoked with phoneNumber:", phoneNumber);

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
    openOptionsPage();
    return;
  }

  if (opt.ip.startsWith("http://") && !opt.allowHttp) {
    console.error("HTTP connections are not allowed. Open options to enable.");
    alert("Calls cannot be made over HTTP unless explicitly allowed in options.");
    return;
  }

  const sanitizedPhone = phoneNumber.replace(/\D/g, "");
  console.log("Sanitized phone number:", sanitizedPhone);

  const url = `${opt.ip}/ari/channels?endpoint=Local/${opt.exten}@${opt.context}` +
  `&extension=${sanitizedPhone}` +
  `&callerId=${sanitizedPhone}` +
  `&timeout=15&context=${opt.context}` +
  `&api_key=${opt.username}:${opt.secret}`;

  console.log("Constructed URL:", url);

  httpSend("POST", url, `Calling ${sanitizedPhone}`);
}

function httpSend(method, url, message) {
  console.log("httpSend() invoked. Requesting:", url);

  fetch(url, { method: method })
  .then((response) => {
    if (response.ok) {
      console.log("Call initiated successfully.");
      chrome.notifications.create({
        type: "basic",
        title: "Asterisk Click to Call",
        message: message,
        iconUrl: "phone48.png",
      });
    } else {
      console.error("Error initiating call:", response.status, response.statusText);
    }
  })
  .catch((error) => {
    console.error("Error sending HTTP request:", error);
  });
}

var opt = {}; // Global options object

init();
