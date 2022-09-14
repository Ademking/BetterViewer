/**
* How it works:
* 1. In webRequest, check if MIME type is image
* 2. If it is, check if it is not injected
* 3. If it is not injected, add tabId to InjectedTabs
* 4. In OnUpdated after image being loaded, check if tabId is in InjectedTabs
* 5. If it is, inject the script and css
* 6. If tab is closed, remove tabId from InjectedTabs
*/
let InjectedTabs = []; // list of tabIds that are currently being injected
let uninstallFormUrl = "https://forms.gle/CNhnnirVXK8tRNFX6";
let welcomeUrl = "https://betterviewer.surge.sh/welcome.html";

// when tab is created or reloaded
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {

 
    
    if (changeInfo.status == 'loading') {
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

            // remove tabId from InjectedTabs
            InjectedTabs.splice(InjectedTabs.indexOf(tabId), 1);
        }
    }
});

// when request is made
chrome.webRequest.onHeadersReceived.addListener(function (details) {
    if (details.tabId !== -1) {

        let header = getHeaderFromHeaders(details.responseHeaders, 'content-type');

        // check if content-disposition is attachment, if it is, do not inject
        let contentDispositionHeader = getHeaderFromHeaders(details.responseHeaders, 'content-disposition');
        let isContentDispositionAttachment = contentDispositionHeader && contentDispositionHeader.value.toLowerCase().includes('attachment');

        

        let res = header && header.value.split(';', 1)[0];

        

        if (res.indexOf('image') === -1) {
            // remove from injected list
            InjectedTabs = InjectedTabs.filter(function (item) {
                return item !== details.tabId;
            });
        }

        // check if image
        if (res && res.indexOf('image') !== -1 && InjectedTabs.indexOf(details.tabId) === -1 && !isContentDispositionAttachment) {

            console.log(details);
            // add tab to injected list
            InjectedTabs.push(details.tabId);


            // Remove "content-security-policy" header from the selected image to allow it to be loaded in the viewer
            // Same idea from here : https://github.com/PhilGrayson/chrome-csp-disable/blob/master/background.js
            // for (let i = 0; i < details.responseHeaders.length; i++) {
            //     if (details.responseHeaders[i].name.toLowerCase() === 'content-security-policy') {
            //         details.responseHeaders[i].value = '';
            //     }
            // }

            for (let respHeader of details.responseHeaders) {
                if (respHeader.name.toLowerCase() === 'content-security-policy') {
                    respHeader.value = '';
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


// when the extension is installed or upgraded ...
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install") {
        // Open when installeds
        chrome.tabs.create({
            url: "https://betterviewer.surge.sh/welcome.html"
        });
        set_default_settings()
        // open when extension is uninstalled
        let uninstallUrl = "https://forms.gle/CNhnnirVXK8tRNFX6"
        if (chrome.runtime.setUninstallURL) {
            chrome.runtime.setUninstallURL(uninstallUrl);
        }

    } else if (details.reason === "update") {
        set_default_settings();
        // set uninstall form url
        let uninstallUrl = "https://forms.gle/CNhnnirVXK8tRNFX6"
        if (chrome.runtime.setUninstallURL) {
            chrome.runtime.setUninstallURL(uninstallUrl);
        }
    } else if (details.reason === "chrome_update") {
        // When browser is updated
    } else if (details.reason === "shared_module_update") {
        // When a shared module is updated
    }
});

// when any tab closed, remove it from injected list
chrome.tabs.onRemoved.addListener(function (tabid, removed) {
    // remove tab from injected list   
    InjectedTabs.splice(InjectedTabs.indexOf(tabid), 1);
});


/**
 * Helper function: get header from headers
 * @param {header} headers 
 * @param {headerName} headerName 
 * @returns 
 */
function getHeaderFromHeaders(headers, headerName) {
    // for (let i = 0; i < headers.length; ++i) {
    //     let header = headers[i];
    //     if (header.name.toLowerCase() === headerName) {
    //         return header;
    //     }
    // }

    for (let header of headers) {
        if (header.name.toLowerCase() === headerName) {
            return header;
        }
    }
}

/**
 * Helper function: set default settings
 */
function set_default_settings(){
     // set default settings
     chrome.storage.sync.set({
        settings: {
            zoomIn: true,
            zoomOut: true,
            oneToOne: true,
            reset: true,
            play: true,
            rotateLeft: true,
            rotateRight: true,
            flipHorizontal: true,
            flipVertical: true,
            crop: true,
            paint: true,
            download: true,
            upload: true,
            colorpicker: true,
            details: true,
            theme: true,
            print: true,
            ocr: true,
            photopea: true,
            tineye: true,
            help: true,
            settings: true,
            qr: true,
            exit: true,
            about: true,
            zoom_ratio: 0.1, // 0.1 is +/- 10% Zoom, 0.5 is +/- 50% Zoom, etc...
            notification_gravity: "top", // top, bottom
            notification_position: "right", // left, right
            toolbar_position: "bottom", // top, bottom
            default_theme: "blurred", // dark, light, blurred
            hide_all_at_start: false, // hide all toolbar buttons at start
        }
    });
}
