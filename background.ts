import { Storage } from "@plasmohq/storage";

chrome.contextMenus.create({
  id: "captureRightClickedImg",
  title: "Open Image in BetterViewer",
  contexts: ["image"],
});

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

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    url: "https://betterviewer.surge.sh/welcome.html",
  });
});

chrome.runtime.setUninstallURL("https://forms.gle/CNhnnirVXK8tRNFX6");
