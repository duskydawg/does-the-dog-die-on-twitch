const POLLING_FREQ_MS = 60000;

function getGameName() {
    let gameTitleElem = document.querySelector('[data-a-target="stream-game-link"]');
    let videoGameTitleElem = document.querySelector('[data-a-target="video-info-game-boxart-link"]');

    if (gameTitleElem !== null) {
        return gameTitleElem.innerText;
    } else if (videoGameTitleElem !== null) {
        return videoGameTitleElem.innerText;
    } else {
        return null;
    }
}

function resetTimer() {
    if (checkGame !== undefined) {
        clearInterval(checkGame);
    }
    
    checkGame = setInterval(() => {
        chrome.runtime.sendMessage({event: "check-game", game: getGameName()});
    }, POLLING_FREQ_MS);
}

chrome.runtime.onMessage.addListener(function(request, _sender, _sendResponse) {
    switch (request['event']) {
        case "url-updated":
            resetTimer();
            let testElemList = document.getElementsByClassName("video-player");

            if (testElemList.length > 0) {
                chrome.runtime.sendMessage({event: "check-game", game: getGameName()});
            }
            break;
        default:
            break;
    }

    return true;
});

var checkGame;
resetTimer();
