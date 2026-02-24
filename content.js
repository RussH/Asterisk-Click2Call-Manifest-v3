// content.js
// Content script to (optionally) intercept tel: and callto: links and hand off to the extension.

(function () {
  "use strict";

  // User-controlled toggle (default false)
  var interceptEnabled = false;

  // Load initial value
  chrome.storage.sync.get(["interceptTelLinks"], function (s) {
    interceptEnabled = (s && s.interceptTelLinks === true);
  });

  // Keep it up to date if user changes options while tabs are open
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "sync" && changes.interceptTelLinks) {
      interceptEnabled = (changes.interceptTelLinks.newValue === true);
    }
  });

  function handleLinkClick(event) {
    if (!interceptEnabled) return;

    // Defensive: event.target is usually an Element, but don't assume
    var target = event.target;
    if (!target || !target.closest) return;

    var link = target.closest('a[href^="tel:"], a[href^="callto:"]');
    if (!link) return;

    var href = link.getAttribute("href");
    if (!href) return;

    // Prevent the browser/OS handler (dialler/softphone/protocol handler)
    event.preventDefault();

    // Optional: stop site JS handlers too (more invasive). Uncomment if desired.
    // if (event.stopImmediatePropagation) event.stopImmediatePropagation();

    // Send the raw href; background.js is the trust boundary and will sanitize safely
    chrome.runtime.sendMessage(
      {
        action: "clickToCall",
        phoneNumber: href
      },
      function () {
        // Avoid logging phone numbers; only log if there's an error
        if (chrome.runtime.lastError) {
          console.error("Click2Call message failed:", chrome.runtime.lastError.message);
        }
      }
    );
  }

  // Capture phase so we run before page handlers
  document.addEventListener("click", handleLinkClick, true);
})();
