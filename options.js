// options.js

function showFlash(message, type) {
  $("#connstate").html(message);
  $("#connstate").removeClass("text-success text-danger").addClass(type);
  $("#connstate").show();
  setTimeout(() => {
    $("#connstate").fadeOut("fast");
  }, 3000);
}

// --- Helpers: protocol handling + permissions ------------------------------

function sanitizeURL(url, allowHttp) {
  if (!url) return url;
  if (url.startsWith("http://") && !allowHttp) {
    return url.replace("http://", "https://");
  }
  return url;
}

function originFrom(base) {
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.host}/`; // e.g. https://10.0.0.5:8088/
  } catch {
    return null;
  }
}

// Must be called from a user gesture (Save button click)
async function requestOriginPermission(ariBase) {
  try {
    const origin = originFrom(ariBase);
    if (!origin) return false;

    const has = await chrome.permissions.contains({ origins: [origin] });
    if (has) return true;

    return await chrome.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
}

// --- Connection check (WebSocket kept as-is, but protocol-aware) -----------

function checkConnection() {
  // Use current form values and respect the Allow HTTP checkbox
  const rawIp = ($("#ip").val() || "http://127.0.0.1:8088").trim();
  const allowHttp = $("#allow-http").is(":checked");
  const ip = sanitizeURL(rawIp, allowHttp);

  const username = $("#username").val();
  const secret = $("#secret").val();
  const exten = $("#exten").val();

  if (ip && username && secret) {
    // http -> ws, https -> wss
    const wsBase = ip.replace(/^http/, "ws");
    const wsUrl =
    `${wsBase}/ari/events?api_key=${encodeURIComponent(username)}:` +
    `${encodeURIComponent(secret)}&app=${encodeURIComponent(exten || "")}`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      showFlash("Connected to ARI successfully!", "text-success");
      socket.close();
    };
    socket.onerror = () => {
      showFlash("Connection to ARI failed. Check console for details.", "text-danger");
      console.error("WebSocket connection failed:", wsUrl);
    };
  }
}

// --- UI validation for HTTP usage ------------------------------------------

function validateIP() {
  const ipValue = ($("#ip").val() || "").trim();
  const warning = $("#ip-warning");
  const checkbox = $("#allow-http");
  const saveButton = $("#save");

  const httpNonLocal =
  ipValue.startsWith("http://") &&
  !ipValue.startsWith("http://127.0.0.1") &&
  !ipValue.startsWith("http://localhost");

  if (httpNonLocal) {
    warning.show();
    if (!checkbox.is(":checked")) {
      saveButton.prop("disabled", true);
    }
  } else {
    warning.hide();
    saveButton.prop("disabled", false);
  }
}

// Enable save button only if the checkbox is ticked for HTTP connections
$("#allow-http").on("change", function () {
  validateIP();
  if ($(this).is(":checked")) {
    $("#save").prop("disabled", false);
  }
});

// --- Save / Restore ---------------------------------------------------------

async function save_options() {
  const rawIp = ($("#ip").val() || "").trim();
  const allowHttp = $("#allow-http").is(":checked");

  const settings = {
    interface: $("input[name=interface]:checked").val(),
    exten: $("#exten").val(),
    amiscript: $("#amiscript").val(),
    // Store the effective URL we’ll actually use (may flip to https://)
    ip: sanitizeURL(rawIp, allowHttp),
    username: $("#username").val(),
    secret: $("#secret").val(),
    context: $("#context").val(),
    allowHttp
  };

  // Tight, per-origin permission (protocol + host + port), prompted on click
  const granted = await requestOriginPermission(settings.ip);
  if (!granted) {
    showFlash("Permission for that server was not granted.", "text-danger");
    return;
  }

  chrome.storage.sync.set(settings, () => {
    console.log("Options saved:", settings);
    $("#save").text("Saved");
    setTimeout(() => $("#save").text("Save"), 1000);

    // Re-run the WS check after saving; background will install DNR on change
    setTimeout(checkConnection, 250);
  });
}

function restore_options() {
  chrome.storage.sync.get(
    ["interface", "exten", "amiscript", "ip", "username", "secret", "context", "allowHttp"],
    (settings) => {
      $("input[value=ami]").prop("checked", true);

      if (settings.interface) {
        $(`input[value=${settings.interface}]`).prop("checked", true).trigger("change");
      }
      $("#exten").val(settings.exten || "");
      $("#amiscript").val(settings.amiscript || "");
      $("#ip").val(settings.ip || "https://127.0.0.1:8088"); // Default to secure
      $("#username").val(settings.username || "");
      $("#secret").val(settings.secret || "");
      $("#context").val(settings.context || "from-internal");

      // Restore HTTP permission checkbox state
      if (settings.allowHttp) {
        $("#allow-http").prop("checked", true);
        $("#save").prop("disabled", false);
      } else {
        $("#allow-http").prop("checked", false);
      }

      validateIP(); // Ensure validation runs on restore
      console.log("Options restored:", settings);
    }
  );
}

// --- Init -------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Show manifest version
  const manifestData = chrome.runtime.getManifest();
  const versionElement = document.getElementById("version");
  if (versionElement && manifestData.version) {
    versionElement.textContent = manifestData.version;
  }

  restore_options();

  $('[data-toggle="popover"]').popover({ placement: "top" });

  $("#save").on("click", (e) => {
    e.preventDefault(); // keep in click handler for permission prompt
    save_options();
  });

  $("#ip").on("input", validateIP);
  validateIP(); // Validate IP on page load

  $("input[name=interface]").on("change", function () {
    if (this.value === "ami") {
      $("#amiscript-group").show();
      $("#ip-group").hide();
      $("#context-group").hide();
    } else {
      $("#amiscript-group").hide();
      $("#ip-group").show();
      $("#context-group").show();
    }
  });

  // Keep your existing behavior: quick connection check when creds change
  $("#username, #secret, #exten").on("change", checkConnection);
});
