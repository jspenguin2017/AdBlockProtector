"use strict";

/**
 * Initialization.
 * @function
 */
a.init = () => {
    //Cache option
    let option = null;
    chrome.storage.sync.get("option", (data) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            //Default to false
            option = false;
        } else {
            option = data["option"] === true;
        }
    });
    //Message listener
    chrome.runtime.onMessage.addListener((...args) => {
        if (args.length === 3) {
            //Each message must have "cmd" field for the command
            switch (args[0]["cmd"]) {
                /**
                 * Update cached option.
                 * @param {boolean} data - The new option.
                 * @return {undefined|string} Returns undefined if the operation was successful,
                 ** the error message otherwise.
                 */
                case "update option":
                    if (option === null) {
                        //In case something went very wrong with the storage
                        args[2]("Extension is not ready, try again later.");
                    } else {
                        option = args[0]["data"] === true;
                        args[2]();
                    }
                    break;
                /**
                 * Get cached option.
                 * This does not make much sense for an event script, but this script may become presistent
                 * in the future.
                 * @return {boolean|null} The option, or null if the extension is not ready.
                 */
                case "get option":
                    args[2](option);
                    break;
                /**
                 * Inject CSS to the caller tab.
                 * @param {string} data - The CSS code to inject.
                 */
                case "inject css":
                    if (args[1].tab) {
                        chrome.tabs.insertCSS(args[1].tab.id, {
                            code: args[0]["data"],
                            frameId: args[1].frameId || 0,
                        });
                    }
                    //Ignore if not called from a tab
                    break;
                /**
                 * Do a cross origin XMLHttpRequest.
                 * @param {Object} details - The details object, see a.request() of content-core
                 ** for more information.
                 * @return {string|null} The response text, or null if the request failed.
                 */
                case "xhr":
                    console.warn(`Sending cross origin request to ${args[0].details.url}`);
                    let req = new XMLHttpRequest();
                    //Event handler
                    req.onreadystatechange = () => {
                        if (req.readyState === 4) {
                            args[2](req.responseText);
                        }
                    };
                    //Create request
                    req.open(args[0].details.method, args[0].details.url);
                    //Set headers
                    if (args[0].details.headers) {
                        for (let key in args[0].details.headers) {
                            req.setRequestHeader(key, args[0].details.headers[key]);
                        }
                    }
                    //Send request
                    req.send(args[0].payload || null);
                    return true; //The callback is done after this handler returns
                /**
                 * Forcefully close the sender tab.
                 */
                case "remove tab":
                    if (args[1].tab) {
                        chrome.tabs.remove(args[1].tab.id);
                    }
                    //Ignore if not called from a tab
                    break;
                default:
                    //Invalid command, ignore
                    break;
            }
        }
        //No command, ignore
    });
    //Extension icon click handler, open options page
    chrome.browserAction.onClicked.addListener(() => {
        chrome.runtime.openOptionsPage();
    });
};
