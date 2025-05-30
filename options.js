function showFlash(message, type) {
  $("#connstate").html(message);
  $("#connstate").removeClass("text-success text-danger").addClass(type);
  $("#connstate").show();
  setTimeout(() => {
    $("#connstate").fadeOut("fast");
  }, 3000);
}

function checkConnection() {
  const ip = $("#ip").val() || "http://127.0.0.1:8088";
  const username = $("#username").val();
  const secret = $("#secret").val();
  const exten = $("#exten").val();

  if (ip && username && secret) {
    const wsUrl = ip.replace(/http/, "ws") + `/ari/events?api_key=${username}:${secret}&app=${exten}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      showFlash("Connected to ARI successfully!", "text-success");
      socket.close();
    };
    socket.onerror = () => {
      showFlash("Connection to ARI failed. Check console for details.", "text-danger");
    };
  }
}

function validateIP() {
  const ipField = $("#ip");
  const ipValue = ipField.val();
  const warning = $("#ip-warning");
  const checkbox = $("#allow-http");
  const saveButton = $("#save");

  // Show warning and require checkbox if using HTTP (except for localhost)
  if (ipValue.startsWith("http://") && !ipValue.startsWith("http://127.0.0.1") && !ipValue.startsWith("http://localhost")) {
    warning.show();
    checkbox.prop("checked", false);
    saveButton.prop("disabled", true);
  } else {
    warning.hide();
    checkbox.prop("checked", false);
    saveButton.prop("disabled", false);
  }
}

// Enable save button only if the checkbox is ticked for HTTP connections
$("#allow-http").on("change", function () {
  if ($(this).is(":checked")) {
    $("#save").prop("disabled", false);
  } else {
    $("#save").prop("disabled", true);
  }
});

function save_options() {
  const settings = {
    interface: $("input[name=interface]:checked").val(),
    exten: $("#exten").val(),
    amiscript: $("#amiscript").val(),
    ip: $("#ip").val(),
    username: $("#username").val(),
    secret: $("#secret").val(),
    context: $("#context").val(),
    allowHttp: $("#allow-http").is(":checked") // Store whether HTTP was explicitly allowed
  };

  chrome.storage.sync.set(settings, () => {
    console.log("Options saved:", settings);
    $("#save").text("Saved");
    setTimeout(() => $("#save").text("Save"), 1000);
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
        validateIP(); // Ensure validation runs on restore
      }

      console.log("Options restored:", settings);
    }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  // Inject manifest version into the page
  const manifestData = chrome.runtime.getManifest();
  const versionElement = document.getElementById("version");
  if (versionElement && manifestData.version) {
    versionElement.textContent = manifestData.version;
  }

  restore_options();

  $('[data-toggle="popover"]').popover({ placement: "top" });

  $("#save").on("click", save_options);
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

  $("#username, #secret").on("change", checkConnection);
});
