var highlight, highlight_regexp;

// Send the phone number to the background service worker
document.addEventListener("sendMessageFromPage", function (e) {
    chrome.runtime.sendMessage({ phone: e.detail });
});

var phoneStyle =
'<a href="#" class="c2c-link" title="Click to call">$&</a>';

function createLinks() {
    findAndReplace(highlight_regexp, phoneStyle);
}

function init() {
    var intervalId;
    const visibilityApi = getVisibilityApi();

    const startInterval = function () {
        intervalId = setInterval(createLinks, 4000);
    };

    document.addEventListener(visibilityApi.visibilityChange, function () {
        if (document[visibilityApi.hidden]) {
            clearInterval(intervalId);
        } else {
            startInterval();
        }
    });

    startInterval();
}

function getVisibilityApi() {
    return {
        hidden: "hidden",
        visibilityChange: "visibilitychange",
    };
}

function findAndReplace(regex, replacement, node = document.body) {
    if (!regex || !replacement) return;

    const childNodes = node.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        const currentNode = childNodes[i];

        if (currentNode.nodeType === 1) {
            const nodeName = currentNode.nodeName.toLowerCase();
            if (
                ![
                    "html",
                "head",
                "style",
                "title",
                "link",
                "meta",
                "script",
                "object",
                "iframe",
                ].includes(nodeName)
            ) {
                findAndReplace(regex, replacement, currentNode);
            }
        } else if (
            currentNode.nodeType === 3 &&
            regex.test(currentNode.data) &&
            currentNode.parentNode.className !== "c2c-link"
        ) {
            const parentNode = currentNode.parentNode;
            const replacementHTML = currentNode.data.replace(regex, replacement);
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = replacementHTML;
            const fragment = document.createDocumentFragment();
            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }
            parentNode.insertBefore(fragment, currentNode);
            parentNode.removeChild(currentNode);
        }
    }
}

// Initialize the highlight logic
chrome.storage.sync.get(["highlight", "highlight_regexp", "highlight_style"], function (e) {
    if (e.highlight) {
        highlight_regexp = e.highlight_regexp;
        if (e.highlight_style) {
            phoneStyle =
            '<a href="#" class="c2c-link" style="' +
            e.highlight_style +
            '" title="Click to call">$&</a>';
        }
        createLinks();
        init();
    }
});
