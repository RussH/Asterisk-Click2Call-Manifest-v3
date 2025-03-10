function openOptionsPage() {
    chrome.runtime.openOptionsPage
    ? chrome.runtime.openOptionsPage()
    : window.open(chrome.runtime.getURL("options.html"));
}

function init() {
    chrome.storage.sync.get(["context", "replchar", "interface", "ip"], function (e) {
        opt.context = e.context || "default"; // Default context if not set
        opt.replchar = e.replchar || "";
        opt.interface = e.interface || "ari"; // Default to ARI
        opt.ip = e.ip || "http://192.168.16.155:8088"; // Default ARI URL
        console.log("Basic functionality initialized.");
    });

    // Register context menu
    chrome.contextMenus.create({
        id: "click2call",
        title: "Call: %s", // Dynamically shows the selected text
        contexts: ["selection"], // Only shows when text is selected
    });

    chrome.contextMenus.onClicked.addListener(function (info, tab) {
        if (info.menuItemId === "click2call") {
            const selectedText = info.selectionText;
            if (selectedText) {
                placeCall(selectedText.trim());
            } else {
                console.error("No text selected.");
            }
        }
    });

    console.log("Context menu registered.");
}

function placeCall(phoneNumber) {
    console.log("Placing call to:", phoneNumber);
    makePhoneCall(phoneNumber);
}

function makePhoneCall(phoneNumber) {
    if (!opt.context || !phoneNumber) {
        console.error("Asterisk context or phone number is not configured.");
        openOptionsPage();
        return;
    }

    const sanitizedPhone = phoneNumber.replace(/\D/g, ""); // Remove non-numeric chars
    console.log("Sanitized phone number:", sanitizedPhone);

    // Construct ARI/AMI request URL
    const url = `${opt.ip}/ari/channels?endpoint=SIP/${sanitizedPhone}&app=${opt.context}`;
    httpSend("POST", url, `Calling ${sanitizedPhone}`);
}

function httpSend(method, url, message) {
    const xhr = new XMLHttpRequest();
    console.log("Requesting:", url);
    xhr.open(method, url, true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            console.log("Call initiated successfully.");
            chrome.notifications.create({
                type: "basic",
                title: "Asterisk Click2Call",
                message: message,
                iconUrl: "phone48.png",
            });
        } else {
            console.error("Error initiating call:", xhr.status, xhr.statusText);
        }
    };
    xhr.onerror = function () {
        console.error("Error sending HTTP request.");
    };
    xhr.send();
}

var opt = {}; // Global options object
init();
