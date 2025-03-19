import { Storage } from "@plasmohq/storage";

// Create a context menu item
chrome.contextMenus.create({
  id: "captureRightClickedImg",
  title: "Open Image in BetterViewer",
  contexts: ["image"],
});

// When the context menu item is clicked
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "captureRightClickedImg") {
    const imageUrl = info.srcUrl;
    const storage = new Storage({
      area: "local",
    });
    await storage.set("imageUrl", imageUrl);
    chrome.tabs.create({
      url: chrome.runtime.getURL("tabs/ImageViewer.html"),
    });
  }
});

// When the extension is installed, open the welcome page
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    url: "https://betterviewer.surge.sh/welcome.html",
  });
});

// When the content script sends a message
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.name === "openImageInNewTab") {
    const tabId = sender.tab.id;
    const imageUrl = request.body.src;
    const storage = new Storage({
      area: "local",
    });
    await storage.set("imageUrl", imageUrl);
    await chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL("tabs/ImageViewer.html"),
    });
  }
});

chrome.runtime.setUninstallURL("https://forms.gle/CNhnnirVXK8tRNFX6");
