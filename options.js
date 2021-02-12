function toTitleCase(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1);
}

function toQuestion(txt) {
    return txt.charAt(txt.length-1) === '?' ? toTitleCase(txt) : toTitleCase(txt + '?');
}

function shiftTopic(clickEvent) {
    switch (clickEvent.target.id) {
        case "add-exclude":
            var fromList = document.getElementById("include-list");
            var toList = document.getElementById("exclude-list");
            var newValue = 0;
            break;
        case "remove-exclude":
            var fromList = document.getElementById("exclude-list");
            var toList = document.getElementById("include-list");
            var newValue = 1;
            break;
        default:
            console.warning("Unrecognised click target");
            return;
    }

    if (fromList.selectedOptions.length > 0) {
        let changedOptions = [];

        while (toList.selectedOptions.length > 0) {
            toList.selectedOptions[0].selected = false;
        }

        while (fromList.selectedOptions.length > 0) {
            let prevGroup = fromList.selectedOptions[0].parentNode;
            changedOptions.push(fromList.selectedOptions[0].value);

            let nextGroup = toList.querySelector(`optgroup[label="${prevGroup.getAttribute("label")}"]`);

            if (nextGroup === null) {
                let existingGroups = toList.getElementsByTagName("optgroup");
                let newGroup = document.createElement("optgroup");
                newGroup.setAttribute("label", prevGroup.getAttribute("label"));

                if (existingGroups.length > 0) {
                    for (const groupTag of existingGroups) {
                        if (groupTag.getAttribute("label") > prevGroup.getAttribute("label")) {
                            groupTag.before(newGroup);
                            break;
                        } else if (groupTag === groupTag.parentNode.lastChild) {
                            groupTag.after(newGroup);
                            break;
                        }
                    }
                } else {
                    toList.appendChild(newGroup);
                }

                nextGroup = newGroup;
            }

            if (nextGroup.childNodes.length > 0) {
                for (const optionTag of nextGroup.children) {
                    if (optionTag.value > fromList.selectedOptions[0].value) {
                        optionTag.before(fromList.selectedOptions[0]);
                        break;
                    } else if (optionTag === optionTag.parentNode.lastChild) {
                        optionTag.after(fromList.selectedOptions[0]);
                        break;
                    }
                }
            } else {
                nextGroup.appendChild(fromList.selectedOptions[0]);
            }

            if (!prevGroup.hasChildNodes() && prevGroup.tagName == "OPTGROUP") {
                prevGroup.remove();
            }
        }

        chrome.storage.sync.get("topics", function(items) {
            if (items['topics'] !== undefined) {
                for (const option of changedOptions) {
                    for (const topic of items['topics']) {
                        if (option == topic['id']) {
                            topic['include'] = newValue;
                            break;
                        }
                    }
                }

                chrome.storage.sync.set({topics: items['topics']}, function() {});
            }
        });

        toList.focus();
    }
}

document.getElementById("select-theme").addEventListener("input", function(event) {
    chrome.storage.sync.set({theme: event.target.value}, function() {});
});

document.getElementById("add-exclude").addEventListener("click", shiftTopic);
document.getElementById("remove-exclude").addEventListener("click", shiftTopic);

chrome.storage.sync.get("topics", function(syncItems) {
    chrome.storage.local.get("topicDetails", function(localItems) {
        if (syncItems['topics'] !== undefined && localItems['topicDetails'] !== undefined) {
            let includeList = document.getElementById("include-list");
            let excludeList = document.getElementById("exclude-list");
            let groups = {};

            for (const topic of syncItems['topics']) {
                let topicInfo = localItems['topicDetails'].find(element => element['id'] == topic['id']);

                if (topicInfo === undefined) {
                    console.error(`Topic details for id ${topic['id']} missing`);
                    break;
                }

                let categoryName = topicInfo['categoryName'];

                if (groups[categoryName] === undefined) {
                    groups[categoryName] = [];
                }

                groups[categoryName].push({
                    id: topic['id'],
                    name: topicInfo['name'],
                    description: topicInfo['description'],
                    include: topic['include']
                });
            }

            let sortedKeys = Object.keys(groups).sort();

            for (const key of sortedKeys) {
                groups[key].sort((first, second) => {
                    if (first['id'] < second['id']) {
                        return -1;
                    } else if (first['id'] > second['id']) {
                        return 1;
                    } else {
                        return 0;
                    }
                });

                let includeGroup;
                let excludeGroup;

                for (const topic of groups[key]) {
                    let optionElem = document.createElement('option');
                    optionElem.setAttribute("value", topic['id']);
                    optionElem.setAttribute("title", toQuestion(topic['description']));
                    optionElem.innerText = toTitleCase(topic['name']);

                    switch (topic['include']) {
                        case 0:
                            if (excludeGroup === undefined) {
                                excludeGroup = document.createElement("optgroup");
                                excludeGroup.setAttribute("label", key);
                                excludeList.appendChild(excludeGroup);
                            }

                            excludeGroup.appendChild(optionElem);
                            break;
                        case 1:
                        default:
                            if (includeGroup === undefined) {
                                includeGroup = document.createElement("optgroup");
                                includeGroup.setAttribute("label", key);
                                includeList.appendChild(includeGroup);
                            }

                            includeGroup.appendChild(optionElem);
                            break;
                    }
                }
            }
        } else {
            console.warning("Topic data missing");
        }
    });
});
