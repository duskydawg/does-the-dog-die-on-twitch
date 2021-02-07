function toTitleCase(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1);
}

function updateTitle(title) {
    document.getElementById("game-name").innerText = title;
}

function updateWarnings(warnings) {
    let warningsList = document.getElementById("warnings");
    let warningMsg = document.getElementById("warn-msg");

    if (warningMsg != null) {
        warningMsg.remove();
    }

    while (warningsList.hasChildNodes()) {
        warningsList.removeChild(warningsList.firstChild);
    }    

    if (warnings != null && warnings.length > 0) {
        for (const warning of warnings) {
            let elem = document.createElement('li');
            elem.innerText = toTitleCase(warning);
            warningsList.appendChild(elem);
        }
    } else {
        let msg = document.createElement('p');
        msg.id = "warn-msg";

        if (warnings != null) {
            msg.innerText = "No warnings for game, enjoy :)";
        } else {
            msg.innerText = "Game not found on 'Does the Dog Die?'";
        }

        document.body.insertBefore(msg, warningsList);
    }
}

chrome.runtime.onMessage.addListener(function(request, _sender, _sendResponse) {
    switch (request['event']) {
        case "cache-updated":
            chrome.tabs.query({active: true, currentWindow: true}, function(result) {
                if (result[0]['id'] == request['tabId']) {
                    updateTitle(request['gameName']);
                    updateWarnings(request['warnings']);
                }
            });
            break;
        default:
            break;
    }
});

chrome.tabs.query({active: true, currentWindow: true}, function(result) {
    let tabIdStr = result[0]['id'].toString();
    chrome.storage.local.get(tabIdStr, function(items) {
        if (items[tabIdStr] !== undefined) {
            updateTitle(items[tabIdStr]['gameName']);
            updateWarnings(items[tabIdStr]['warnings']);
        } else {
            console.debug(`Cache miss for tab ${result[0]['id']}, background script may be running`);
        }
    });
});
