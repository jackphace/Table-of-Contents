//Check whether new version is installed.  
//TODO: something on installs/upgrades
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install") {
        //Store default values for settings
        var defaultValues = {
            "tocHotkey": "t",
            "previousHotkey": "z",
            "currentHotkey": "x",
            "nextHotkey": "c",
            "collapseGroupHotkey": "v",
            "selectParentHotkey": "b",
            "activeWhenMinimized": "true",
            "expandOnClick": "false",
            "skipCollapsed": "true",
            "requireDeeper": "false",
            "filterEmptyHeaders": "false",
            "scrollSpeed": "350",
            "toggleSpeed": "350"
        };

        chrome.storage.sync.set(defaultValues, function () {
            console.log("Initializing default settings.");
        });
    } else if (details.reason === "update") {
        var thisVersion = chrome.runtime.getManifest().version;
        console.log("Updated from " + details.previousVersion + " to " + thisVersion + " + !");
    }
});

//Settings to load
var settings = [
    "tocHotkey", "previousHotkey", "currentHotkey", "nextHotkey", "collapseGroupHotkey", "selectParentHotkey",
    "activeWhenMinimized", "expandOnClick", "skipCollapsed",
    "requireDeeper", "filterEmptyHeaders",
    "scrollSpeed", "toggleSpeed"];

//Store what tabs have had scripts injected to them
var activeTabs = [];

//Listen for tabs changing state
chrome.tabs.onUpdated.addListener(
function (tabId, changeInfo, tab) {
    //If the tab has reloaded, remove it from the list of active tabs
//    debugger;
    if (changeInfo.status === "loading") {
        var tabOffset = activeTabs.indexOf(tabId);

        //Refreshed tab was in the list of active tabs
        if (tabOffset !== -1) {
            activeTabs.splice(tabOffset, 1);
        }
    }
});

//Listen for the global hotkeys for activating the table of contents
chrome.commands.onCommand.addListener(function (command) {
    //When a hotkey has been pressed, fetch the settings for the extension from storage
    chrome.storage.sync.get(settings, function (loadedSettings) {
        //Find the currently active tab
        chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, function (tabs) {
            //Get the tab ID of the tab to inject the table of contents into
            var tabId = tabs[0].id;

            //Check if the tab is in the list of already active ToC tabs.  If it isn't, inject all needed scripts and css
            if (activeTabs.indexOf(tabId) === -1) {
                //Add current tab to the end of the list of active tabs
                activeTabs[activeTabs.length] = tabId;

                //Inject css for the table of contents elements
                //var cssPath = chrome.extension.getURL('toc.css');
                //chrome.tabs.insertCSS(tabId, { file:cssPath }, function () { });
                //chrome.tabs.insertCSS(tabId, { code:"background-color: red !important;"}, function () { });

                //Pass parameters and libraries to toc script using this method: 
                //http://stackoverflow.com/questions/4976996/chromes-tabs-executescript-passing-parameters-and-using-libraries
                chrome.tabs.executeScript(tabId, { code: encodeSettings(loadedSettings) },
                    function() {
                        //Inject jQuery
                        chrome.tabs.executeScript(tabId, { file: "jquery-1.9.1.js" },
                            function() {
                                //Inject jquery ScrollTo library
                                chrome.tabs.executeScript(tabId, { file: "jquery.scrollTo-1.4.3.1-min.js" },
                                    function() {
                                        //Inject Mousetrap library for controlling the table of contents with shortcuts
                                        chrome.tabs.executeScript(tabId, { file: "mousetrap.js" },
                                            function() {
                                                //Inject the CSS for the table of contents using injectCSS.js -- chrome.tabs.insertCSS would be the prefered solution but it isn't working
                                                //TODO: find out why chrome.tabs.insertCSS isn't working
                                                chrome.tabs.executeScript(tabId, { file: "injectCSS.js" },
                                                    function() {
                                                        //Inject the final file, responsible for setting up the table of contents and hotkeys
                                                        chrome.tabs.executeScript(tabId, { file: "toc.js" },
                                                            function() {
                                                                //Based on which command was used, call a function in toc.js that will
                                                                //let the user select the area to build the ToC in or build it for the full-page
                                                                var tocFunctionCall = "";

                                                                //Hotkey for full-page ToC
                                                                if (command === "build-toc") {
                                                                    tocFunctionCall = "buildToC();";
                                                                }
                                                                    //Hotkey for selected-area ToC
                                                                else if (command === "select-build-toc") {
                                                                    tocFunctionCall = "chooseContainer();";
                                                                }

                                                                chrome.tabs.executeScript(tabId, { code: tocFunctionCall }, function(callback) {
                                                                    console.log("Executed command: " + tocFunctionCall);
                                                                    console.log(callback);
                                                                });
                                                            });
                                                    });
                                            });
                                    });
                            });
                    });
            } else {
                //If the tab already has had all necessary scripts injected, just issue the command to it
                console.log("Just issuing command.  Script already injected.");

                //Based on which command was used, call a function in toc.js that will
                //let the user select the area to build the ToC in or build it for the full-page
                var tocFunctionCall = "";

                //Hotkey for full-page ToC
                if (command === "build-toc") {
                    tocFunctionCall = "buildToC();";
                }
                    //Hotkey for selected-area ToC
                else if (command === "select-build-toc") {
                    tocFunctionCall = "chooseContainer();";
                }

                chrome.tabs.executeScript(tabId, { code: tocFunctionCall }, function (callback) {
                    console.log("Executed command: " + tocFunctionCall);
                    console.log(callback);
                });
            }
        });
    });
});

//Encode the retrieved settings in a format they can be injected in (text representation of declaration code)
function encodeSettings(loadedSettings) {
    var settingsCode = "";

    for (var i = 0; i < settings.length; i++) {
        var name = settings[i];
        var value = loadedSettings[name];

        settingsCode += "var " + name + " = ";

        if (isString(value))
            settingsCode += "\"" + value + "\";\n";
        else
            settingsCode += value + ";\n";
    }
    return settingsCode;
}

//Check if the settings are a string so as to wrap them in quotes when encoding
function isString(obj) {
    //var toString = Object.prototype.toString;
    //return toString.call(obj) == '[object String]';

    return isNaN(parseInt(obj, 10));
}