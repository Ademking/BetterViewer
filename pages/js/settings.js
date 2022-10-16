// get all current settings
let currentSettings = () => {
    let settings = {};
    let checkboxes = document.querySelectorAll('input[type=checkbox]');
    checkboxes.forEach(checkbox => {
        settings[checkbox.id] = checkbox.checked;
    });
    let toolbar_position = document.querySelector('#toolbar-position').value;
    let default_theme = document.querySelector('#default-theme').value;
    let upload_site = document.querySelector('#upload-site').value;
    let zoom_ratio = document.querySelector('#zoom-ratio').value;
    // split notification position
    let notification_position_array = document.querySelector('#toast-position').value.split('-'); // for example: top-right
    settings['notification_gravity'] = notification_position_array[0];
    settings['notification_position'] = notification_position_array[1];
    settings['toolbar_position'] = toolbar_position;
    settings['default_theme'] = default_theme;
    settings['upload_site'] = upload_site;
    settings['zoom_ratio'] = zoom_ratio;

    return settings;
}

// // listen to every select change
// let selectElems = document.querySelectorAll('select');
// selectElems.forEach(selectElem => {
//     selectElem.addEventListener('change', () => {
//         window.parent.postMessage({
//             type: 'settings',
//             settings: currentSettings()
//         }, '*');
//     });
// });


// // listen to every checkbox change
// document.querySelectorAll('input[type=checkbox]').forEach(checkbox => {
//     checkbox.addEventListener('change', () => {
//         // post to parent
//         window.parent.postMessage({
//             type: 'settings',
//             settings: currentSettings()
//         }, '*');
//     });
// });


document.querySelector('#save-btn').addEventListener('click', () => {
    window.parent.postMessage({
        type: 'settings',
        settings: currentSettings()
    }, '*');
});


// on page load 
window.addEventListener('load', () => {
    // get chrome.storage.sync settings
    chrome.storage.sync.get('settings', (settings) => {
        document.querySelector('body').style.display = 'block';
        // get default_theme
        let default_theme = settings.settings.default_theme;
        // get notification_gravity and notification_position
        let notification_gravity = settings.settings.notification_gravity;
        let notification_position = settings.settings.notification_position;
        // get toolbar_position
        let toolbar_position = settings.settings.toolbar_position;
        // get upload_site
        let upload_site = settings.settings.upload_site;
        // get zoom_ratio
        let zoom_ratio = settings.settings.zoom_ratio;


        // update notif value with storage settings
        document.querySelector('#toast-position').value = `${notification_gravity}-${notification_position}`;
        // update toolbar position
        document.querySelector('#toolbar-position').value = toolbar_position;
        // update default theme
        document.querySelector('#default-theme').value = default_theme;
        // update upload site
        document.querySelector('#upload-site').value = upload_site;
        // update zoom ratio
        document.querySelector('#zoom-ratio').value = zoom_ratio;

        try {
            for (let setting in settings.settings) {

                let settingElem = document.querySelector(`#${setting}`);
                if (settingElem) {
                    settingElem.checked = settings.settings[setting];
                }
            }
        } catch (error) {
            console.error("error", error);
        }
    });
});