// background.js

// Create a context menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "click2call",
        title: "Click2Call",
        contexts: ["selection"], // Appears when text is selected
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "click2call") {
        const selectedText = info.selectionText;
        console.log("Selected text for calling:", selectedText);
        placeCall(selectedText); // Call the function to place the call
    }
});

// Example call handling function
function placeCall(phoneNumber) {
    console.log("Placing call to:", phoneNumber);
    // Add your call logic here
}
