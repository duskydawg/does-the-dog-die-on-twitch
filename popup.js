function toTitleCase(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1);
}

function updateTitle(title) {
    document.getElementById("game-name").innerText = title;
}

function updateWarnings(warnings) {
    chrome.storage.sync.get("topics", function(items) {
        let warningPrefs;

        if (items['topics'] !== undefined) {
            warningPrefs = items['topics'];
        } else {
            console.warning("No warning preferences found, including all warnings");
            warningPrefs = [];
        }
        console.debug(warningPrefs);

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
                let pref = warningPrefs.find(element => element['id'] == warning['warningId']);

                if (pref === undefined || pref['include'] > 0) {
                    let elem = document.createElement('li');
                    elem.innerText = toTitleCase(warning['warningName']);
                    warningsList.appendChild(elem);
                }
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
    });
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

chrome.storage.sync.get('theme', function(items) {
    let theme;

    if (items['theme'] !== undefined) {
        theme = items['theme'];
    } else {
        chrome.storage.sync.set({theme: "light"}, function() {});
        theme = "light";
    }

    if (theme === "dark") {
        document.body.classList.add("dark-theme");
    }
});
