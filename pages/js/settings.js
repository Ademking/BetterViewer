// listen to every checkbox
document.querySelectorAll('input[type=checkbox]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        // get all selected settings
        let currentSettings = () => {
            let settings = {};
            let checkboxes = document.querySelectorAll('input[type=checkbox]');
            checkboxes.forEach(checkbox => {
                settings[checkbox.id] = checkbox.checked;
            });
            return settings;
        }
        // post to parent
        window.parent.postMessage({
            type: 'settings',
            settings: currentSettings()
        }, '*');
    });
});


// on page load 
window.addEventListener('load', () => {
    // get chrome.storage.sync settings
    chrome.storage.sync.get('settings', (settings) => {
        // set all settings
            // show body
            document.querySelector('body').style.display = 'block';
            for (let setting in settings.settings) {
                console.log(`id: ${setting} - status: ${settings.settings[setting]}`);
                document.querySelector(`#${setting}`).checked = settings.settings[setting];
            }
    });
});