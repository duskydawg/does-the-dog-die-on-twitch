const TAB_UPDATE_WAIT_MS = 2000;
const MAX_STRING_DIFF = 3;
var D3_API_KEY;

function stringDiff(firstStr, secondStr) {
    const str1 = firstStr.toLowerCase();
    const str2 = secondStr.toLowerCase();
    
    var results = Array(str2.length+1).fill(null).map(() => Array(str1.length+1).fill(null));  
    for (let i = 0; i <= str1.length; i++) {
        results[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
        results[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        let subCost = str1[i-1] === str2[j-1] ? 0 : 1;
        results[j][i] = Math.min(
            results[j][i-1] + 1,
            results[j-1][i] + 1,
            results[j-1][i-1] + subCost)
      }
    }
    
    return results[str2.length][str1.length];
}

function stringsMatch(firstStr, secondStr) {
    return stringDiff(firstStr, secondStr) <= MAX_STRING_DIFF;
}

function toTitleCase(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1);
}

function saveToCache(tabId, gameName, twitchGameName, warnings) {
    let cache = {};
    cache[tabId.toString()] = {gameName: gameName, twitchGameName: twitchGameName, warnings: warnings};
    chrome.storage.local.set(cache, function() {
        chrome.runtime.sendMessage({event: "cache-updated", tabId: tabId, gameName: gameName, warnings: warnings});
    });

    if (warnings != null) {
        chrome.browserAction.setBadgeText({tabId: tabId, text: warnings.length.toString()});
    } else {
        chrome.browserAction.setBadgeText({tabId: tabId, text: ''});
    }
}

function handleD3Details(tabId, twitchGameName) {
    let gameName = JSON.parse(this.responseText)['item']['name'];
    let warnings = [];

    for (const item of JSON.parse(this.responseText)['topicItemStats']) {
        if (item['isYes'] == 1) {
            warnings.push(item['topic']['smmwDescription']);
        }
    }

    saveToCache(tabId, gameName, twitchGameName, warnings);
}

function handleD3(tabId, twitchGameName) {
    for (const item of JSON.parse(this.responseText)['items']) {
        if (item['itemType']['name'] == "Video Game" && stringsMatch(item['name'], twitchGameName)) {
            var id = item['id'];
            break;
        }
    }

    if (id !== undefined) {
        let req = new XMLHttpRequest();
        req.addEventListener('load', function() {
            handleD3Details.call(this, tabId, twitchGameName);
        });
        req.open('GET', `https://www.doesthedogdie.com/media/${id}` );
        req.setRequestHeader("Accept", "application/json");
        req.setRequestHeader("X-API-KEY", D3_API_KEY);
        req.send();
    } else {
        saveToCache(tabId, twitchGameName, twitchGameName, null);
    }
}

function checkCacheDiff(tabId, gameName) {
    let tabIdStr = tabId.toString();

    chrome.storage.local.get(tabIdStr, function(items) {
        if (items[tabIdStr] === undefined || items[tabIdStr]['twitchGameName'] != gameName) {
            chrome.storage.local.remove(tabIdStr, function() {
                let req = new XMLHttpRequest();
                req.addEventListener("load", function() {
                    handleD3.call(this, tabId, gameName);
                });
                req.open("GET", `https://www.doesthedogdie.com/dddsearch?q=${encodeURIComponent(gameName)}`);
                req.setRequestHeader("Accept", "application/json");
                req.setRequestHeader("X-API-KEY", D3_API_KEY);
                req.send();
            });
        }
    });
}

chrome.runtime.onMessage.addListener(function(request, sender, _sendResponse) {
    switch (request['event']) {
        case "check-game":
            if (/https:\/\/(?:www\.)?twitch.tv\/(([a-zA-Z0-9_]+)|(videos\/[0-9]+))(\?.+)?$/.test(sender.tab.url)) {
                if (request['game'] != null) {
                    checkCacheDiff(sender.tab.id, request['game']);
                } else {
                    console.error("Game name could not be found");
                }
            }
            break;
        default:
            break;
    }
});

chrome.tabs.onCreated.addListener((tab) => {
    chrome.browserAction.disable(tab.id, function() {});
})

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo['status'] == "complete" && RegExp("^https://(?:www\.)?twitch.tv/.+").test(tab['url'])) {
        chrome.browserAction.enable(tabId, function() {});
        setTimeout(function() {
            chrome.tabs.sendMessage(tabId, {event: "url-updated"});
        }, TAB_UPDATE_WAIT_MS);
    } else if (!RegExp("^https://(?:www\.)?twitch.tv/.+").test(tab['url'])) {
        chrome.browserAction.disable(tabId, function() {});
    }
});

chrome.tabs.onRemoved.addListener(function(tabId, _removeInfo) {
    chrome.storage.local.remove(tabId.toString(), function() {});
});

chrome.storage.local.clear(function() {});

var keyReq = new XMLHttpRequest();
keyReq.addEventListener("load", function() {
    D3_API_KEY = this.responseText;
});
keyReq.open("GET", chrome.runtime.getURL('public.key'));
keyReq.send();
