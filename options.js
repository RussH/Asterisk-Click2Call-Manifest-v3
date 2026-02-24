// options.js

(function () {
  // --- UI helpers -----------------------------------------------------------

  function showFlash(message, typeClass) {
    // typeClass: "text-success" or "text-danger" or "text-info"
    var $status = $("#status");
    $status
    .stop(true, true)
    .removeClass("text-success text-danger text-info")
    .addClass(typeClass || "")
    .text(message)
    .show();

    setTimeout(function () {
      $status.fadeOut("fast");
    }, 3000);
  }

  // --- Helpers: URL normalisation + permissions ----------------------------

  function stripTrailingSlashes(s) {
    return String(s || "").replace(/\/+$/, "");
  }

  function normalizeAriUrl(raw, allowHttp) {
    // Accept:
    //  - https://host:8088
    //  - http://host:8088 (only if allowHttp)
    //  - host:8088  (we’ll assume https://)
    //  - 127.0.0.1  (we’ll assume https://127.0.0.1)
    var s = $.trim(raw || "");
    if (!s) return "";

    // If user pasted a URL with spaces/newlines etc
    s = s.replace(/\s+/g, "");

    // If missing scheme, assume https://
    if (!/^https?:\/\//i.test(s)) {
      s = "https://" + s;
    }

    s = stripTrailingSlashes(s);

    // If user entered http:// but hasn’t acknowledged allowHttp, flip to https://
    if (s.indexOf("http://") === 0 && !allowHttp) {
      s = s.replace("http://", "https://");
    }

    // Validate parse
    try {
      // eslint-disable-next-line no-new
      new URL(s);
    } catch (e) {
      return "";
    }

    return s;
  }

  function originFrom(ariBase) {
    // Returns an origin with trailing slash: https://host:port/
    try {
      var u = new URL(ariBase);
      return u.protocol + "//" + u.host + "/";
    } catch (e) {
      return null;
    }
  }

  // Must be called from a user gesture (Save button click)
  async function requestOriginPermission(ariBase) {
    try {
      var origin = originFrom(ariBase);
      if (!origin) return false;

      // permissions.* expects match patterns, e.g. https://host:port/*
      var pattern = origin + "*";

      var has = await chrome.permissions.contains({ origins: [pattern] });
      if (has) return true;

      return await chrome.permissions.request({ origins: [pattern] });
    } catch (e) {
      return false;
    }
  }

  // --- Connection check (protocol-aware) -----------------------------------

  function checkConnection() {
    var rawIp = $("#ip").val() || "";
    var allowHttp = $("#allow-http").is(":checked");
    var ip = normalizeAriUrl(rawIp, allowHttp);

    var username = $.trim($("#username").val() || "");
    var secret = $("#secret").val() || "";
    var exten = $.trim($("#exten").val() || "");

    if (!ip || !username || !secret) return;

    // http -> ws, https -> wss
    var wsBase = ip.replace(/^http/i, "ws");
    var wsUrl =
    wsBase +
    "/ari/events?api_key=" +
    encodeURIComponent(username) +
    ":" +
    encodeURIComponent(secret) +
    "&app=" +
    encodeURIComponent(exten || "");

    try {
      var socket = new WebSocket(wsUrl);

      socket.onopen = function () {
        showFlash("Connected to ARI successfully!", "text-success");
        try { socket.close(); } catch (e) {}
      };

      socket.onerror = function () {
        showFlash("Connection to ARI failed. Check URL/credentials.", "text-danger");
        // Avoid logging secrets; wsUrl contains api_key
        console.error("WebSocket connection failed (ARI events).");
      };
    } catch (e) {
      showFlash("WebSocket error while testing ARI connection.", "text-danger");
    }
  }

  // --- UI validation for HTTP usage ----------------------------------------

  function validateIP() {
    var ipValue = $.trim($("#ip").val() || "");
    var $warning = $("#ip-warning");
    var $ack = $("#allow-http");
    var $save = $("#save");

    // Show warning only for non-local HTTP
    var httpNonLocal =
    ipValue.indexOf("http://") === 0 &&
    ipValue.indexOf("http://127.0.0.1") !== 0 &&
    ipValue.indexOf("http://localhost") !== 0;

    if (httpNonLocal) {
      $warning.show();
      // Must acknowledge to enable Save
      $save.prop("disabled", !$ack.is(":checked"));
    } else {
      $warning.hide();
      $save.prop("disabled", false);
    }
  }

  // --- Save / Restore -------------------------------------------------------

  async function save_options() {
    // Keep in click handler (user gesture) for permissions.request()
    var rawIp = $("#ip").val() || "";
    var allowHttp = $("#allow-http").is(":checked");
    var effectiveIp = normalizeAriUrl(rawIp, allowHttp);

    if (!effectiveIp) {
      showFlash("ARI URL looks invalid. Use e.g. https://pbx.example.com:8088", "text-danger");
      return;
    }

    var settings = {
      // Options UI hard-codes ARI via hidden input
      interface: $("input[name=interface]").val() || "ari",

 exten: $.trim($("#exten").val() || ""),
 ip: effectiveIp,
 username: $.trim($("#username").val() || ""),
 secret: $("#secret").val() || "",
 context: $.trim($("#context").val() || "all"),
 allowHttp: allowHttp,

 // User-controlled interception of tel:/callto:
 interceptTelLinks: $("#interceptTelLinks").is(":checked")
    };

    // Basic sanity before prompting for permissions
    if (!settings.username || !settings.secret) {
      showFlash("Please fill ARI username and password.", "text-danger");
      return;
    }

    // Tight, per-origin permission (protocol + host + port), prompted on Save click
    var granted = await requestOriginPermission(settings.ip);
    if (!granted) {
      showFlash("Permission for that ARI server was not granted.", "text-danger");
      return;
    }

    chrome.storage.sync.set(settings, function () {
      if (chrome.runtime.lastError) {
        showFlash("Failed to save options: " + chrome.runtime.lastError.message, "text-danger");
        return;
      }

      // Write back the normalised URL so it doesn’t “look like it reverted”
      $("#ip").val(settings.ip);

      $("#save").text("Saved");
      setTimeout(function () { $("#save").text("Save"); }, 1000);

      // Re-run the WS check after saving; background will install DNR on change
      setTimeout(checkConnection, 250);
    });
  }

  function restore_options() {
    chrome.storage.sync.get(
      ["interface", "exten", "ip", "username", "secret", "context", "allowHttp", "interceptTelLinks"],
      function (settings) {
        $("#exten").val(settings.exten || "");
        $("#ip").val(settings.ip || "https://127.0.0.1:8088");
        $("#username").val(settings.username || "");
        $("#secret").val(settings.secret || "");
        $("#context").val(settings.context || "all");

        $("#allow-http").prop("checked", settings.allowHttp === true);

        // Default OFF to avoid surprising users
        $("#interceptTelLinks").prop("checked", settings.interceptTelLinks === true);

        validateIP();
      }
    );
  }

  // --- Init ----------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    // Show manifest version
    try {
      var manifestData = chrome.runtime.getManifest();
      var versionElement = document.getElementById("version");
      if (versionElement && manifestData && manifestData.version) {
        versionElement.textContent = manifestData.version;
      }
    } catch (e) {}

    restore_options();

    $("#save").on("click", function (e) {
      e.preventDefault();
      save_options();
    });

    // Validation / state wiring
    $("#ip").on("input", validateIP);
    $("#allow-http").on("change", validateIP);
    validateIP();

    // Quick connection check when creds change
    $("#username, #secret, #exten, #ip").on("change", function () {
      var u = $.trim($("#username").val() || "");
      var p = $("#secret").val() || "";
      var ip = $.trim($("#ip").val() || "");
      if (u && p && ip) checkConnection();
    });
  });
})();
