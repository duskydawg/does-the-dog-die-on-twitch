document.getElementById("select-theme").addEventListener("input", function(event) {
    chrome.storage.sync.set({theme: event.target.value}, function() {});
});
