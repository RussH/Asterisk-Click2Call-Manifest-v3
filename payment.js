function enableBasicFeatures() {
    console.log("Basic features enabled.");
    chrome.runtime.sendMessage({
        subject: "setTitle",
        title: "Asterisk Click2Call: Basic Features Active",
    });
}

function disablePremiumFeatures() {
    console.log("Premium features disabled.");
    chrome.runtime.sendMessage({
        subject: "setTitle",
        title: "Asterisk Click2Call: Premium Features Disabled",
    });
}

function initBasicFeatures() {
    console.log("Initializing basic features...");
    enableBasicFeatures();
}

initBasicFeatures();
