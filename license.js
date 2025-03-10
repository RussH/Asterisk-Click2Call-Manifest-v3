function enableBasicFeatures() {
    console.log("Basic features enabled.");
    chrome.runtime.sendMessage({
        subject: "setTitle",
        title: "Asterisk Click2Call: Basic Features Active",
    });
}

function initBasicFeatures() {
    enableBasicFeatures();
}

initBasicFeatures();
