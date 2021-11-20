/**
* How it works:
* 1. In webRequest, check if MIME type is image
* 2. If it is, check if it is not injected
* 3. If it is not injected, add tabId to InjectedTabs
* 4. In OnUpdated after image being loaded, check if tabId is in InjectedTabs
* 5. If it is, inject the script and css
*/
let InjectedTabs = []; // list of tabIds that are currently being injected

// when tab is created or reloaded
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {

    if (changeInfo.status == 'complete') {
        // check if tab is marked as injected
        if (InjectedTabs.includes(tabId)) {
            chrome.tabs.executeScript(tabId, {
                file: './dist/all.js',
            }, function (res1) {
                chrome.tabs.insertCSS(tabId, {
                    file: './dist/all.css',
                }, function (res2) {
                    chrome.tabs.sendMessage(tabId, {
                        type: 'injected',
                        url: tab.url,
                    });
                })
            });
        }
    }
});

// when request is made
chrome.webRequest.onHeadersReceived.addListener(function (details) {
    if (details.tabId !== -1) {

        let header = getHeaderFromHeaders(details.responseHeaders, 'content-type');
        let res = header && header.value.split(';', 1)[0];

        if (res.indexOf('image') === -1) {
            // remove from injected list
            InjectedTabs = InjectedTabs.filter(function (item) {
                return item !== details.tabId;
            });
        }

        // check if image
        if (res && res.indexOf('image') !== -1 && InjectedTabs.indexOf(details.tabId) === -1) {
           
            // add tab to injected list
            InjectedTabs.push(details.tabId);


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

// when any tab closed, remove it from injected list
chrome.tabs.onRemoved.addListener(function(tabid, removed) {
    // remove tab from injected list   
    InjectedTabs.splice(InjectedTabs.indexOf(tabid), 1);
});