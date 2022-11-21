// get all current shortcut hotkeys toggle state
let currentShortcutHotkeys = () => {
    let shortcutHotkeys = {};
    let checkboxes = document.querySelectorAll('input[type=checkbox]');
    checkboxes.forEach(checkbox => {
        shortcutHotkeys[checkbox.id] = checkbox.checked;
    });

    // get modifiers
    let zoom_in_mod = document.querySelector('#zoom-in-mod').value;
    let zoom_out_mod = document.querySelector('#zoom-out-mod').value;
    let one_to_one_mod = document.querySelector('#one-to-one-mod').value;
    let reset_mod = document.querySelector('#reset-mod').value;
    let fit_to_screen_mod = document.querySelector('#fit-to-screen-mod').value;
    let fullscreen_mod = document.querySelector('#fullscreen-mod').value;
    let rotate_left_mod = document.querySelector('#rotate-left-mod').value;
    let rotate_right_mod = document.querySelector('#rotate-right-mod').value;
    let flip_horizontal_mod = document.querySelector('#flip-horizontal-mod').value;
    let flip_vertical_mod = document.querySelector('#flip-vertical-mod').value;
    let crop_mod = document.querySelector('#crop-mod').value;
    let photo_editor_mod = document.querySelector('#photo-editor-mod').value;
    let download_mod = document.querySelector('#download-mod').value;
    let upload_mod = document.querySelector('#upload-mod').value;
    let color_picker_mod = document.querySelector('#color-picker-mod').value;
    let details_mod = document.querySelector('#details-mod').value;
    let theme_mod = document.querySelector('#theme-mod').value;
    let print_mod = document.querySelector('#print-mod').value;
    let extract_text_mod = document.querySelector('#extract-text-mod').value;
    let photopea_mod = document.querySelector('#photopea-mod').value;
    let reverse_search_mod = document.querySelector('#reverse-search-mod').value;
    let help_mod = document.querySelector('#help-mod').value;
    let turn_off_mod = document.querySelector('#turn-off-mod').value;

    // get keys
    let zoom_in_key = document.querySelector('#zoom-in-key').value;
    let zoom_out_key = document.querySelector('#zoom-out-key').value;
    let one_to_one_key = document.querySelector('#one-to-one-key').value;
    let reset_key = document.querySelector('#reset-key').value;
    let fit_to_screen_key = document.querySelector('#fit-to-screen-key').value;
    let fullscreen_key = document.querySelector('#fullscreen-key').value;
    let rotate_left_key = document.querySelector('#rotate-left-key').value;
    let rotate_right_key = document.querySelector('#rotate-right-key').value;
    let flip_horizontal_key = document.querySelector('#flip-horizontal-key').value;
    let flip_vertical_key = document.querySelector('#flip-vertical-key').value;
    let crop_key = document.querySelector('#crop-key').value;
    let photo_editor_key = document.querySelector('#photo-editor-key').value;
    let download_key = document.querySelector('#download-key').value;
    let upload_key = document.querySelector('#upload-key').value;
    let color_picker_key = document.querySelector('#color-picker-key').value;
    let details_key = document.querySelector('#details-key').value;
    let theme_key = document.querySelector('#theme-key').value;
    let print_key = document.querySelector('#print-key').value;
    let extract_text_key = document.querySelector('#extract-text-key').value;
    let photopea_key = document.querySelector('#photopea-key').value;
    let reverse_search_key = document.querySelector('#reverse-search-key').value;
    let help_key = document.querySelector('#help-key').value;
    let turn_off_key = document.querySelector('#turn-off-key').value;

    // set modifiers
    shortcutHotkeys['zoom_in_mod'] = zoom_in_mod;
    shortcutHotkeys['zoom_out_mod'] = zoom_out_mod;
    shortcutHotkeys['one_to_one_mod'] = one_to_one_mod;
    shortcutHotkeys['reset_mod'] = reset_mod;
    shortcutHotkeys['fit_to_screen_mod'] = fit_to_screen_mod;
    shortcutHotkeys['fullscreen_mod'] = fullscreen_mod;
    shortcutHotkeys['rotate_left_mod'] = rotate_left_mod;
    shortcutHotkeys['rotate_right_mod'] = rotate_right_mod;
    shortcutHotkeys['flip_horizontal_mod'] = flip_horizontal_mod;
    shortcutHotkeys['flip_vertical_mod'] = flip_vertical_mod;
    shortcutHotkeys['crop_mod'] = crop_mod;
    shortcutHotkeys['photo_editor_mod'] = photo_editor_mod;
    shortcutHotkeys['download_mod'] = download_mod;
    shortcutHotkeys['upload_mod'] = upload_mod;
    shortcutHotkeys['color_picker_mod'] = color_picker_mod;
    shortcutHotkeys['details_mod'] = details_mod;
    shortcutHotkeys['theme_mod'] = theme_mod;
    shortcutHotkeys['print_mod'] = print_mod;
    shortcutHotkeys['extract_text_mod'] = extract_text_mod;
    shortcutHotkeys['photopea_mod'] = photopea_mod;
    shortcutHotkeys['reverse_search_mod'] = reverse_search_mod;
    shortcutHotkeys['help_mod'] = help_mod;
    shortcutHotkeys['turn_off_mod'] = turn_off_mod;

    // set keys
    shortcutHotkeys['zoom_in_key'] = zoom_in_key;
    shortcutHotkeys['zoom_out_key'] = zoom_out_key;
    shortcutHotkeys['one_to_one_key'] = one_to_one_key;
    shortcutHotkeys['reset_key'] = reset_key;
    shortcutHotkeys['fit_to_screen_key'] = fit_to_screen_key;
    shortcutHotkeys['fullscreen_key'] = fullscreen_key;
    shortcutHotkeys['rotate_left_key'] = rotate_left_key;
    shortcutHotkeys['rotate_right_key'] = rotate_right_key;
    shortcutHotkeys['flip_horizontal_key'] = flip_horizontal_key;
    shortcutHotkeys['flip_vertical_key'] = flip_vertical_key;
    shortcutHotkeys['crop_key'] = crop_key;
    shortcutHotkeys['photo_editor_key'] = photo_editor_key;
    shortcutHotkeys['download_key'] = download_key;
    shortcutHotkeys['upload_key'] = upload_key;
    shortcutHotkeys['color_picker_key'] = color_picker_key;
    shortcutHotkeys['details_key'] = details_key;
    shortcutHotkeys['theme_key'] = theme_key;
    shortcutHotkeys['print_key'] = print_key;
    shortcutHotkeys['extract_text_key'] = extract_text_key;
    shortcutHotkeys['photopea_key'] = photopea_key;
    shortcutHotkeys['reverse_search_key'] = reverse_search_key;
    shortcutHotkeys['help_key'] = help_key;
    shortcutHotkeys['turn_off_key'] = turn_off_key;

    return shortcutHotkeys;
}


document.querySelector('#save-btn').addEventListener('click', () => {
    window.parent.postMessage({
        type: 'shortcutHotkeys',
        shortcutHotkeys: currentShortcutHotkeys()
    }, '*');
});


// on page load 
window.addEventListener('load', () => {
    // get chrome.storage.sync settings for Shortcut Hotkey Toggle State
    chrome.storage.sync.get('shortcutHotkeys', (shortcutHotkeys) => {
        document.querySelector('body').style.display = 'block';
        const sc_sc = shortcutHotkeys.shortcutHotkeys;

         // fetch modifiers
         let zoom_in_mod = sc_sc.zoom_in_mod;
         let zoom_out_mod = sc_sc.zoom_out_mod;
         let one_to_one_mod = sc_sc.one_to_one_mod;
         let reset_mod = sc_sc.reset_mod;
         let fit_to_screen_mod = sc_sc.fit_to_screen_mod;
         let fullscreen_mod = sc_sc.fullscreen_mod;
         let rotate_left_mod = sc_sc.rotate_left_mod;
         let rotate_right_mod = sc_sc.rotate_right_mod;
         let flip_horizontal_mod = sc_sc.flip_horizontal_mod;
         let flip_vertical_mod = sc_sc.flip_vertical_mod;
         let crop_mod = sc_sc.crop_mod;
         let photo_editor_mod = sc_sc.photo_editor_mod;
         let download_mod = sc_sc.download_mod;
         let upload_mod = sc_sc.upload_mod;
         let color_picker_mod = sc_sc.color_picker_mod;
         let details_mod = sc_sc.details_mod;
         let theme_mod = sc_sc.theme_mod;
         let print_mod = sc_sc.print_mod;
         let extract_text_mod = sc_sc.extract_text_mod;
         let photopea_mod = sc_sc.photopea_mod;
         let reverse_search_mod = sc_sc.reverse_search_mod;
         let help_mod = sc_sc.help_mod;
         let turn_off_mod = sc_sc.turn_off_mod;

         // fetch keys
         let zoom_in_key = sc_sc.zoom_in_key;
         let zoom_out_key = sc_sc.zoom_out_key;
         let one_to_one_key = sc_sc.one_to_one_key;
         let reset_key = sc_sc.reset_key;
         let fit_to_screen_key = sc_sc.fit_to_screen_key;
         let fullscreen_key = sc_sc.fullscreen_key;
         let rotate_left_key = sc_sc.rotate_left_key;
         let rotate_right_key = sc_sc.rotate_right_key;
         let flip_horizontal_key = sc_sc.flip_horizontal_key;
         let flip_vertical_key = sc_sc.flip_vertical_key;
         let crop_key = sc_sc.crop_key;
         let photo_editor_key = sc_sc.photo_editor_key;
         let download_key = sc_sc.download_key;
         let upload_key = sc_sc.upload_key;
         let color_picker_key = sc_sc.color_picker_key;
         let details_key = sc_sc.details_key;
         let theme_key = sc_sc.theme_key;
         let print_key = sc_sc.print_key;
         let extract_text_key = sc_sc.extract_text_key;
         let photopea_key = sc_sc.photopea_key;
         let reverse_search_key = sc_sc.reverse_search_key;
         let help_key = sc_sc.help_key;
         let turn_off_key = sc_sc.turn_off_key;
 
         // update modifiers
         document.querySelector('#zoom-in-mod').value = zoom_in_mod;
         document.querySelector('#zoom-out-mod').value = zoom_out_mod;
         document.querySelector('#one-to-one-mod').value = one_to_one_mod;
         document.querySelector('#reset-mod').value = reset_mod;
         document.querySelector('#fit-to-screen-mod').value = fit_to_screen_mod;
         document.querySelector('#fullscreen-mod').value = fullscreen_mod;
         document.querySelector('#rotate-left-mod').value = rotate_left_mod;
         document.querySelector('#rotate-right-mod').value = rotate_right_mod;
         document.querySelector('#flip-horizontal-mod').value = flip_horizontal_mod;
         document.querySelector('#flip-vertical-mod').value = flip_vertical_mod;
         document.querySelector('#crop-mod').value = crop_mod;
         document.querySelector('#photo-editor-mod').value = photo_editor_mod;
         document.querySelector('#download-mod').value = download_mod;
         document.querySelector('#upload-mod').value = upload_mod;
         document.querySelector('#color-picker-mod').value = color_picker_mod;
         document.querySelector('#details-mod').value = details_mod;
         document.querySelector('#theme-mod').value = theme_mod;
         document.querySelector('#print-mod').value = print_mod;
         document.querySelector('#extract-text-mod').value = extract_text_mod;
         document.querySelector('#photopea-mod').value = photopea_mod;
         document.querySelector('#reverse-search-mod').value = reverse_search_mod;
         document.querySelector('#help-mod').value = help_mod;
         document.querySelector('#turn-off-mod').value = turn_off_mod;
 
         // update keys
         document.querySelector('#zoom-in-key').value = zoom_in_key;
         document.querySelector('#zoom-out-key').value = zoom_out_key;
         document.querySelector('#one-to-one-key').value = one_to_one_key;
         document.querySelector('#reset-key').value = reset_key;
         document.querySelector('#fit-to-screen-key').value = fit_to_screen_key;
         document.querySelector('#fullscreen-key').value = fullscreen_key;
         document.querySelector('#rotate-left-key').value = rotate_left_key;
         document.querySelector('#rotate-right-key').value = rotate_right_key;
         document.querySelector('#flip-horizontal-key').value = flip_horizontal_key;
         document.querySelector('#flip-vertical-key').value = flip_vertical_key;
         document.querySelector('#crop-key').value = crop_key;
         document.querySelector('#photo-editor-key').value = photo_editor_key;
         document.querySelector('#download-key').value = download_key;
         document.querySelector('#upload-key').value = upload_key;
         document.querySelector('#color-picker-key').value = color_picker_key;
         document.querySelector('#details-key').value = details_key;
         document.querySelector('#theme-key').value = theme_key;
         document.querySelector('#print-key').value = print_key;
         document.querySelector('#extract-text-key').value = extract_text_key;
         document.querySelector('#photopea-key').value = photopea_key;
         document.querySelector('#reverse-search-key').value = reverse_search_key;
         document.querySelector('#help-key').value = help_key;
         document.querySelector('#turn-off-key').value = turn_off_key;

        try {
            for (let hotkeyToggle in sc_sc) {

                let hotkeyToggleElem = document.querySelector(`#${hotkeyToggle}`);
                if (hotkeyToggleElem) {
                    hotkeyToggleElem.checked = sc_sc[hotkeyToggle];
                }
            }
        } catch (error) {
            console.error("error", error);
        }
    });
});

