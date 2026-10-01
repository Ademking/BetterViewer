// Toolbar popup: open an empty BetterViewer, screenshot or browse the current
// page, or jump to Settings / Keyboard shortcuts / About. Page actions run in
// background.js and content.js.
const api = globalThis.browser ?? globalThis.chrome;
const $ = (id) => document.getElementById(id);

$("version").textContent = api.runtime.getManifest().version;

// Labels in the browser's language (extension/_locales); the HTML has English.
for (const el of document.querySelectorAll("[data-i18n]")) {
  el.textContent = api.i18n.getMessage(el.dataset.i18n) || el.textContent;
}
document.documentElement.lang = api.i18n.getUILanguage();
document.documentElement.dir = api.i18n.getMessage("@@bidi_dir") || "ltr";

/** Open BetterViewer in a new tab (optionally with a panel open) and close the popup. */
const openViewer = async (query = "") => {
  await api.tabs.create({ url: `${api.runtime.getURL("index.html")}${query}` });
  window.close();
};

$("open").addEventListener("click", () => openViewer());
$("settings").addEventListener("click", () => openViewer("?panel=settings"));
$("shortcuts").addEventListener("click", () => openViewer("?panel=shortcuts"));
$("about").addEventListener("click", () => openViewer("?panel=about"));

// The shortcuts the user actually has (they can be changed in the browser).
const pageActions = Promise.resolve(api.tabs.query({ active: true, currentWindow: true })).then(([tab]) =>
  // Browser pages (settings, new tab, the extension stores) can't be captured
  // or browsed by extensions.
  tab && /^(https?|file):/i.test(tab.url || "") ? tab : null
);

Promise.all([Promise.resolve(api.commands.getAll()).catch(() => []), pageActions]).then(([commands, tab]) => {
  for (const hint of document.querySelectorAll("[data-command]")) {
    // On pages where these can't run the rows are simply greyed out.
    hint.textContent = tab ? (commands.find((c) => c.name === hint.dataset.command)?.shortcut ?? "") : "";
  }
  if (!tab) {
    for (const id of ["screenshot", "gallery"]) $(id).disabled = true;
    return;
  }
  for (const [id, type] of [
    ["screenshot", "betterviewer:screenshot"],
    ["gallery", "betterviewer:gallery"],
  ]) {
    $(id).addEventListener("click", async () => {
      await api.runtime.sendMessage({ type, tabId: tab.id });
      window.close();
    });
  }
});
