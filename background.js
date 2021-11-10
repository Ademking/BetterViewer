chrome.webRequest.onHeadersReceived.addListener(function (details) {
    if (details.tabId !== -1) {

        let header = getHeaderFromHeaders(details.responseHeaders, 'content-type');
        let res = header && header.value.split(';', 1)[0];
        // check if image
        if (res && res.indexOf('image') !== -1) {


            /**
             * Note: I know this is not the best way to do this, but I don't know how to do it better
             * I tried to abstract this but sometimes it doesn't work (when refreshing the image tab)
             * https://stackoverflow.com/questions/21535233/injecting-multiple-scripts-through-executescript-in-google-chrome-extension
             * My current solution is to use gulp to concat all the scripts and then inject them
             * If you know a better way, please let me know
             */
            chrome.tabs.executeScript(details.tabId, {
                file: './dist/all.js',
            }, function (res) {
                chrome.tabs.insertCSS(details.tabId, {
                    file: './dist/all.css',
                }, function (res) {
                    chrome.tabs.sendMessage(details.tabId, {
                        type: 'injected',
                        url: details.url,
                    });
                })
            });


            // Remove "content-security-policy" header from the selected image to allow it to be loaded in the viewer
            // Same idea from here : https://github.com/PhilGrayson/chrome-csp-disable/blob/master/background.js
            for (let i = 0; i < details.responseHeaders.length; i++) {
                if (details.responseHeaders[i].name.toLowerCase() === 'content-security-policy') {
                    details.responseHeaders[i].value = '';
                }
            }
            return {
                responseHeaders: details.responseHeaders
            };
        }
    }
}, {
    urls: ['*://*/*'],
    types: ['main_frame']
}, ['responseHeaders', 'blocking']);


/**
 * Helper function: get header from headers
 * @param {header} headers 
 * @param {headerName} headerName 
 * @returns 
 */
function getHeaderFromHeaders(headers, headerName) {
    for (let i = 0; i < headers.length; ++i) {
        let header = headers[i];
        if (header.name.toLowerCase() === headerName) {
            return header;
        }
    }
}


// when the extension is installed or upgraded ...
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install") {
        // Code to be executed on first install
        chrome.tabs.create({
            url: "https://betterviewer.surge.sh/welcome.html"
        });
    } else if (details.reason === "update") {
        // When extension is updated
    } else if (details.reason === "chrome_update") {
        // When browser is updated
    } else if (details.reason === "shared_module_update") {
        // When a shared module is updated
    }
});





