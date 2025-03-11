// call.js

function openOptionsPage() {
  chrome.runtime.openOptionsPage
  ? chrome.runtime.openOptionsPage()
  : window.open(chrome.runtime.getURL("options.html"));
}

function init() {
  console.log("Initializing Click to Call extension.");

  // Load settings from chrome.storage including username, secret, and exten.
  chrome.storage.sync.get(
    ["context", "replchar", "interface", "ip", "username", "secret", "exten"],
    function (settings) {
      opt.context = settings.context || "default"; // Default context if not set
      opt.replchar = settings.replchar || "";
      opt.interface = settings.interface || "ari"; // Default to ARI
      opt.ip = settings.ip || "http://192.168.1.100:8088"; // Default ARI URL
      opt.username = settings.username || "";
      opt.secret = settings.secret || "";
      opt.exten = settings.exten || "";
      console.log("Settings loaded:", opt);
    }
  );

  // Remove existing context menu items to avoid duplicate creation.
  chrome.contextMenus.removeAll(() => {
    // Register the context menu
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

function placeCall(phoneNumber) {
  console.log("placeCall() invoked with phoneNumber:", phoneNumber);

  // Re-read settings to ensure we have the latest configuration.
  chrome.storage.sync.get(
    ["context", "replchar", "interface", "ip", "username", "secret", "exten"],
    function (settings) {
      // Assign settings consistently.
      opt.context   = settings.context || "default";
      opt.replchar  = settings.replchar || "";
      opt.interface = settings.interface || "ari";
      opt.ip        = settings.ip || "http://192.168.1.100:8088";
      opt.username  = settings.username || "";
      opt.secret    = settings.secret || "";
      opt.exten       = settings.exten || "";

      // Check if all required settings are present.
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
  // Make sure required settings are set
  if (!opt.exten || !opt.ip || !opt.context || !opt.username || !opt.secret) {
    console.error("Missing required ARI configuration.");
    openOptionsPage();
    return;
  }

  // Remove non-numeric characters from the phone number.
  const sanitizedPhone = phoneNumber.replace(/\D/g, "");
  console.log("Sanitized phone number:", sanitizedPhone);

  // Construct the URL in the format that worked via curl:
  // http://10.0.0.1:8088/ari/channels?endpoint=Local/666@all
  // &extension=01234567890&callerId=23459876&timeout=15&context=all
  // &api_key=matches the config in mini-https:secretpassword
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
  // Use fetch since XMLHttpRequest is not available in service workers.
  fetch(url, {
    method: method,
  })
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
