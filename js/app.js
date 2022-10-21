// run when scripts and styles are loaded
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == 'injected') {
    chrome.storage.sync.get('settings', function (settings) {
      try {
        if (settings.settings) {
          init(settings)
        }
      } catch (e) {
        console.error('error while loading settings: ', e)
      }
    })
  }
})

let IS_PICKER_OPEN = false
let IS_DETAILS_OPEN = false
let IS_HELP_OPEN = false
let IS_CROP_OPEN = false

let viewer
let isLocalFile = window.location.href.match(/(file:\/\/)/) ? true : false;
let BACKGROUND_TYPE = 'blurred'
let UPLOAD_SITE = 'imgbb'
let ImgCanvas
let isFlippedHorizontally = false
let isFlippedVertically = false
let IMGBB_TOKEN = '8be35a61597b285f9c95669fdc565b00'
let IMGUR_TOKEN = '405d491c9e67e9f'
let isKeypressEnabled = false
let WINBOX_CLASSES = ['no-scrollbar', 'no-max', 'no-min', 'no-full', 'no-resize', 'no-animation']
let ocrLangList = {
  Afrikaans: 'afr',
  Albanian: 'sqi',
  Amharic: 'amh',
  Arabic: 'ara',
  Armenian: 'hye',
  Azerbaijani: 'aze',
  Basque: 'eus',
  Belarusian: 'bel',
  Bengali: 'ben',
  Bosnian: 'bos',
  Bulgarian: 'bul',
  Burmese: 'mya',
  Catalan: 'cat',
  Cebuano: 'ceb',
  'Chinese Simplified': 'chi_sim',
  'Chinese Simplified (vertical)': 'chi_sim_vert',
  'Chinese Traditional': 'chi_tra',
  'Chinese Traditional (vertical)': 'chi_tra_vert',
  Corsican: 'cos',
  Croatian: 'hrv',
  Czech: 'ces',
  Danish: 'dan',
  Dutch: 'nld',
  English: 'eng',
  Esperanto: 'epo',
  Estonian: 'est',
  Filipino: 'fil',
  Finnish: 'fin',
  French: 'fra',
  Frisian: 'fry',
  Galician: 'glg',
  Georgian: 'kat',
  German: 'deu',
  Greek: 'ell',
  Gujarati: 'guj',
  Haitian: 'hat',
  Hebrew: 'heb',
  Hindi: 'hin',
  Hungarian: 'hun',
  Icelandic: 'isl',
  Indonesian: 'ind',
  Irish: 'gle',
  Italian: 'ita',
  Japanese: 'jpn',
  'Japanese (vertical)': 'jpn_vert',
  Javanese: 'jav',
  Kannada: 'kan',
  Kazakh: 'kaz',
  Khmer: 'khm',
  Korean: 'kor',
  'Korean (vertical)': 'kor_vert',
  Kurdish: 'kmr',
  Lao: 'lao',
  Latin: 'lat',
  Latvian: 'lav',
  Lithuanian: 'lit',
  Luxembourgish: 'ltz',
  Macedonian: 'mkd',
  Malay: 'msa',
  Malayalam: 'mal',
  Maltese: 'mlt',
  Maori: 'mri',
  Marathi: 'mar',
  Mongolian: 'mon',
  Nepali: 'nep',
  Norwegian: 'nor',
  Persian: 'fas',
  Polish: 'pol',
  Portuguese: 'por',
  Romanian: 'ron',
  Russian: 'rus',
  'Scottish Gaelic': 'gla',
  Serbian: 'srp',
  Sindhi: 'snd',
  Sinhala: 'sin',
  Slovak: 'slk',
  Slovenian: 'slv',
  Spanish: 'spa',
  Sundanese: 'sun',
  Swahili: 'swa',
  Swedish: 'swe',
  Tajik: 'tgk',
  Tamil: 'tam',
  Telugu: 'tel',
  Thai: 'tha',
  Turkish: 'tur',
  Ukrainian: 'ukr',
  Urdu: 'urd',
  Uzbek: 'uzb',
  Vietnamese: 'vie',
  Welsh: 'cym',
  Yiddish: 'yid',
  Yoruba: 'yor'
}
let tippyData = [
  {
    type: 'zoom-in',
    text: 'Zoom In'
  },
  {
    type: 'zoom-out',
    text: 'Zoom Out'
  },
  {
    type: 'one-to-one',
    text: '1:1'
  },
  {
    type: 'reset',
    text: 'Reset'
  },
  {
    type: 'fit-to-screen',
    text: 'Fit to Screen'
  },
  {
    type: 'rotate-left',
    text: 'Rotate Left'
  },
  {
    type: 'rotate-right',
    text: 'Rotate Right'
  },
  {
    type: 'flip-horizontal',
    text: 'Flip Horizontal'
  },
  {
    type: 'flip-vertical',
    text: 'Flip Vertical'
  },
  {
    type: 'crop',
    text: 'Crop Image'
  },
  {
    type: 'download',
    text: 'Download'
  },
  {
    type: 'play',
    text: 'Fullscreen'
  },
  {
    type: 'details',
    text: 'Details'
  },
  {
    type: 'colorpicker',
    text: 'Color Picker'
  },
  {
    type: 'paint',
    text: 'Photo Editor'
  },
  {
    type: 'print',
    text: 'Print image'
  },
  {
    type: 'help',
    text: 'Help'
  },
  {
    type: 'theme',
    text: 'Toggle Theme'
  },
  {
    type: 'exit',
    text: 'Turn Off'
  },
  {
    type: 'upload',
    text: 'Upload Image'
  },
  {
    type: 'ocr',
    text: 'Extract Text'
  },
  {
    type: 'photopea',
    text: 'Edit in Photopea'
  },
  {
    type: 'tineye',
    text: 'Reverse Image Search'
  },
  {
    type: 'about',
    text: 'About'
  },
  {
    type: 'qr',
    text: 'QR Code Scanner'
  },
  {
    type: 'settings',
    text: 'Settings'
  }
]

// ~~~ Custom Shortcut Hotkeys Section ~~~ \\
chrome.storage.sync.get("shortcutHotkeys", (shortcutHotkeys) => {
    const sc_sc = shortcutHotkeys.shortcutHotkeys;

    document.addEventListener("keydown", function (e) {
        let activeModifier;
        if (e.ctrlKey) {activeModifier = "mod";} else if (e.shiftKey) {activeModifier = "shift";} else if (e.altKey) {activeModifier = "alt";};
       
        if (!isKeypressEnabled) {
            // if shortcut toggle = on { set custom hotkey; activate shortcut}
            if (sc_sc.zoomInToggle === true) {
                const hotkeyMod = sc_sc.zoom_in_mod;
                const hotkeyKey = sc_sc.zoom_in_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                // uses the custom hotkey to execute the selected shortcut
                Mousetrap.bind(customHotkey, (e) => {
                  document.getElementsByClassName('viewer-zoom-in')[0].click();
                    // prevent the default shortcut
                    e.preventDefault();
                });
            }
            
            if (sc_sc.zoomOutToggle === true) {
                const hotkeyMod = sc_sc.zoom_out_mod;
                const hotkeyKey = sc_sc.zoom_out_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-zoom-out')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.oneToOneToggle === true) {
                const hotkeyMod = sc_sc.one_to_one_mod
                const hotkeyKey = sc_sc.one_to_one_key
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-one-to-one')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.resetToggle === true) {
                const hotkeyMod = sc_sc.reset_mod;
                const hotkeyKey = sc_sc.reset_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName("viewer-reset")[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.fitToScreenToggle === true) {
                const hotkeyMod = sc_sc.fit_to_screen_mod;
                const hotkeyKey = sc_sc.fit_to_screen_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-fit-to-screen')[0].click();
                    e.preventDefault();
                });
            }

            if (sc_sc.fullscreenToggle === true) {
                const hotkeyMod = sc_sc.fullscreen_mod;
                const hotkeyKey = sc_sc.fullscreen_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-play')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.rotateLeftToggle === true) {
                const hotkeyMod = sc_sc.rotate_left_mod;
                const hotkeyKey = sc_sc.rotate_left_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-rotate-left')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.rotateRightToggle === true) {
                const hotkeyMod = sc_sc.rotate_right_mod;
                const hotkeyKey = sc_sc.rotate_right_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-rotate-right')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.flipHorizontalToggle === true) {
                const hotkeyMod = sc_sc.flip_horizontal_mod;
                const hotkeyKey = sc_sc.flip_horizontal_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-flip-horizontal')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.flipVerticalToggle === true) {
                const hotkeyMod = sc_sc.flip_vertical_mod;
                const hotkeyKey = sc_sc.flip_vertical_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-flip-vertical')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.cropImageToggle === true) {
                const hotkeyMod = sc_sc.crop_mod;
                const hotkeyKey = sc_sc.crop_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-crop')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.photoEditorToggle === true) {
                const hotkeyMod = sc_sc.photo_editor_mod;
                const hotkeyKey = sc_sc.photo_editor_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-paint')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.downloadToggle === true) {
                const hotkeyMod = sc_sc.download_mod;
                const hotkeyKey = sc_sc.download_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-download')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.uploadImageToggle === true) {
                const hotkeyMod = sc_sc.upload_mod;
                const hotkeyKey = sc_sc.upload_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-upload')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.colorPickerToggle === true) {
                const hotkeyMod = sc_sc.color_picker_mod;
                const hotkeyKey = sc_sc.color_picker_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-colorpicker')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.detailsToggle === true) {
                const hotkeyMod = sc_sc.details_mod;
                const hotkeyKey = sc_sc.details_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-details')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.themeToggle === true) {
                const hotkeyMod = sc_sc.theme_mod;
                const hotkeyKey = sc_sc.theme_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-theme')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.printImageToggle === true) {
                const hotkeyMod = sc_sc.print_mod;
                const hotkeyKey = sc_sc.print_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-print')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.extractTextToggle === true) {
                const hotkeyMod = sc_sc.extract_text_mod;
                const hotkeyKey = sc_sc.extract_text_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-ocr')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.photopeaToggle === true) {
                const hotkeyMod = sc_sc.photopea_mod;
                const hotkeyKey = sc_sc.photopea_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-photopea')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.reverseSearchToggle === true) {
                const hotkeyMod = sc_sc.reverse_search_mod;
                const hotkeyKey = sc_sc.reverse_search_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-tineye')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.helpToggle === true) {
                const hotkeyMod = sc_sc.help_mod;
                const hotkeyKey = sc_sc.help_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-help')[0].click();
                    e.preventDefault();
                });
            }
            
            if (sc_sc.turnOffToggle === true) {
                const hotkeyMod = sc_sc.turn_off_mod;
                const hotkeyKey = sc_sc.turn_off_key;
                const customHotkey = hotkeyMod + "+" + hotkeyKey;

                Mousetrap.bind(customHotkey, (e) => {
                    document.getElementsByClassName('viewer-exit')[0].click();
                    e.preventDefault();
                });
            }
            
        }
    });
});




 // ~~~ Initializes the Extension ~~~ \\
function init(settings) {
  BACKGROUND_TYPE = settings.settings.default_theme
  UPLOAD_SITE = settings.settings.upload_site

  // checks the zoom setting - if it's nulled, then the default is set to 0.1 (10%)
  settings.settings.zoom_ratio == null ? (settings.settings.zoom_ratio = 0.1) : (zoomSetting = settings.settings.zoom_ratio)
  zoomSetting = settings.settings.zoom_ratio

  let imgElement = document.getElementsByTagName('img')[0] // get img element
  // if img element is found
  if (imgElement) {
    let blurryDiv = document.createElement('div') // create blurry div
    blurryDiv.setAttribute('class', 'blurry-bg') // add class to blurry div
    imgElement.parentNode.insertBefore(blurryDiv, imgElement) // add before img element

    // init Viewer
    viewer = new Viewer(imgElement, {
      inline: false,
      loading: false,
      interval: 0,
      zoomable: true,
      transition: true,
      navbar: false,
      title: false,
      keyboard: false,
      backdrop: false, // prevent exit when click backdrop
      zoomRatio: zoomSetting,
      toolbar: {
        next: false,
        prev: false,
        zoomIn: settings.settings.zoomIn && {
          show: 1,
          size: 'large'
        },
        zoomOut: settings.settings.zoomOut && {
          show: 1,
          size: 'large'
        },
        reset: settings.settings.reset && {
          show: 1,
          size: 'large',
          click: function () {
            viewer.image.src = window.location.href
            viewer.reset()
            setTimeout(() => {
              if (settings.settings.toolbar_position === 'top') {
                viewer.move(0, 50)
              }
            }, 100)
            window.dispatchEvent(new Event('resize'))
          }
        },
        oneToOne: settings.settings.oneToOne && {
          show: 1,
          size: 'large'
        },
        fitToScreen: settings.settings.fitToScreen && {
          show: 1,
          size: 'large',
          click: function () {
            // Calculates a Zoom Ratio, based off of the Max & Default height/width
            let heightRatio = window.innerHeight / imgElement.naturalHeight;
            let widthRatio = window.innerWidth / imgElement.naturalWidth

            // Zooms to the Max Height & Centers the Image : if Zoomed Width > Max Width, scale to the Max Width instead
            if (imgElement.naturalWidth*heightRatio > window.innerWidth) {
              viewer.zoomTo(widthRatio, true);
              viewer.moveTo(0, (window.innerHeight - (imgElement.naturalHeight * widthRatio))/2);
            } else {
              viewer.zoomTo(heightRatio, true);
              viewer.moveTo((window.innerWidth - (imgElement.naturalWidth * heightRatio))/2, 0);
            }
          }
        },
        play: settings.settings.play && {
          show: 1,
          size: 'large',
          click: function () {
            viewer.image
              .requestFullscreen()
              .then(function () {
                // console.log('requestFullscreen success');
              })
              .catch(function (error) {
                console.error(error)
              })
          }
        },
        rotateLeft: settings.settings.rotateLeft && {
          show: 1,
          size: 'large'
        },
        rotateRight: settings.settings.rotateRight && {
          show: 1,
          size: 'large'
        },
        flipHorizontal: settings.settings.flipHorizontal && {
          show: 1,
          size: 'large'
        },
        flipVertical: settings.settings.flipVertical && {
          show: 1,
          size: 'large'
        },
        crop: settings.settings.crop && {
          show: 1,
          size: 'large',
          click: function () {
            if (!IS_CROP_OPEN) {
              IS_CROP_OPEN = true
              // reset viewer
              //viewer.reset();
              let reset = viewer.reset()
              setTimeout(() => {
                if (settings.settings.toolbar_position === 'top') {
                  viewer.move(0, 50)
                }
              }, 100)
              if (reset) {
                crop(viewer, viewer.image.src, viewer.image.width, viewer.image.height)
              }
            }
          }
        },
        paint: settings.settings.paint && {
          show: isLocalFile ? 0 : 1,
          size: 'large',
          click: function () {
            isKeypressEnabled = true
            // create new winbox
            let winboxPaint = new WinBox('Photo Editor', {
              class: ['no-scrollbar', 'no-min', 'no-animation'],
              index: 9999,
              x: 'center',
              y: 'center',
              width: '90%',
              height: '90%',
              background: 'rgba(0,0,0,0.9)',
              html: `<div id="paint-wrapper" style="width: 100%; height: 100%"></div>`
            })

            winboxPaint.show()

            const config = {
              theme: {
                palette: {
                  'txt-primary': '#ffffff',
                  'txt-primary-invert': '#ffffff',
                  //   'txt-secondary': '#ffffff',
                  //  'txt-secondary-invert': '#ffffff',
                  // 'txt-placeholder': '#ffffff',
                  'accent-primary': '#1E262C',
                  'accent-primary-hover': '#000000',
                  'accent-primary-active': '#000000',
                  // 'accent-primary-disabled': '#ffffff',
                  'bg-primary': '#00000000' // canvas bg
                  //'bg-primary-hover': '#000000',
                  //'bg-primary-active': '#000000',
                  //'bg-primary-0-5-opacity': '#ffffff',
                  //'bg-secondary': '#ffffff',
                  //'icons-primary': '#ffffff',
                  //'icons-primary-opacity-0-6': '#ffffff',
                  //'icons-secondary': '#ffffff',
                  // 'btn-primary-text': '#ffffff',
                  // 'btn-disabled-text': '#ffffff',
                  // 'link-primary': '#ffffff',
                  // 'link-hover': '#ffffff',
                  // 'link-active': '#ffffff',
                  // 'borders-primary': '#ffffff',
                  // 'borders-secondary': '#ffffff',
                  // 'borders-strong': '#ffffff',
                  // 'borders-invert': '#ffffff',
                  // 'border-active-bottom': '#ffffff',
                  // 'active-secondary': '#ffffff',
                  // 'active-secondary-hover': '#ffffff',
                  // 'active-secondary-active': '#ffffff',
                  // 'tag': '#ffffff',
                  // 'error': '#ffffff',
                  // 'success': '#ffffff',
                  // 'warning': '#ffffff',
                  // 'info': '#ffffff',
                  // 'light-shadow': '#ffffff',
                }
              },
              onBeforeSave: function (imageFileInfo) {
                // prevent default behavior
                return false
              },
              onSave: function (imageData, imageDesignState) {
                console.log('~ imageDesignState', imageDesignState)
                console.log('~ imageData', imageData)
                let newImgBase64 = imageData.imageBase64
                let imgElements = document.getElementsByTagName('img')
                for (let elem of imgElements) {
                  elem.src = newImgBase64
                }
                // trigger resize event in setTimeout
                setTimeout(function () {
                  window.dispatchEvent(new Event('resize'))
                }, 100)
                showNotification('💾 Image saved successfully', '#ffffff', '#000000', settings)
                setTimeout(() => {
                  if (settings.settings.toolbar_position === 'top') {
                    viewer.move(0, 50)
                  }
                }, 100)
                winboxPaint.close()
              },
              moreSaveOptions: [
                {
                  label: 'Save as new file',
                  onClick: (triggerSaveModal, triggerSave) =>
                    triggerSaveModal((...args) => {
                      let a = document.createElement('a')
                      a.href = args[0].imageBase64
                      a.download = args[0].fullName
                      a.click()

                      showNotification('💾 Image downloaded successfully', '#ffffff', '#000000', settings)
                    })
                }
              ],
              source: viewer.image.src,
              //onSave: (editedImageObject, designState) => console.log('saved', editedImageObject, designState),
              annotationsCommon: {
                fill: '#ff0000'
              },
              Text: { text: 'Your Text Here...' },
              translations: {
                profile: 'Profile',
                coverPhoto: 'Cover photo',
                facebook: 'Facebook',
                socialMedia: 'Social Media',
                fbProfileSize: '180x180px',
                fbCoverPhotoSize: '820x312px'
              },
              Crop: {
                presetsItems: [
                  {
                    titleKey: 'classicTv',
                    descriptionKey: '4:3',
                    ratio: 4 / 3
                    // icon: CropClassicTv, // optional, CropClassicTv is a React Function component. Possible (React Function component, string or HTML Element)
                  },
                  {
                    titleKey: 'cinemascope',
                    descriptionKey: '21:9',
                    ratio: 21 / 9
                    // icon: CropCinemaScope, // optional, CropCinemaScope is a React Function component.  Possible (React Function component, string or HTML Element)
                  }
                ],
                presetsFolders: [
                  {
                    titleKey: 'socialMedia', // will be translated into Social Media as backend contains this translation key
                    // icon: Social, // optional, Social is a React Function component. Possible (React Function component, string or HTML Element)
                    groups: [
                      {
                        titleKey: 'facebook',
                        items: [
                          {
                            titleKey: 'profile',
                            width: 180,
                            height: 180,
                            descriptionKey: 'fbProfileSize'
                          },
                          {
                            titleKey: 'coverPhoto',
                            width: 820,
                            height: 312,
                            descriptionKey: 'fbCoverPhotoSize'
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              tabsIds: [window.FilerobotImageEditor.TABS.ADJUST, window.FilerobotImageEditor.TABS.ANNOTATE, window.FilerobotImageEditor.TABS.WATERMARK, window.FilerobotImageEditor.TABS.FILTERS, window.FilerobotImageEditor.TABS.FINETUNE, window.FilerobotImageEditor.TABS.RESIZE], // or ['Adjust', 'Annotate', 'Watermark']
              defaultTabId: window.FilerobotImageEditor.TABS.ANNOTATE, // or 'Annotate'
              defaultToolId: window.FilerobotImageEditor.TOOLS.TEXT // or 'Text'
            }

            console.log(window.FilerobotImageEditor.TABS)

            // Assuming we have a div with id="editor_container"
            const filerobotImageEditor = new FilerobotImageEditor(document.querySelector('#paint-wrapper'), config)

            filerobotImageEditor.render({
              onClose: closingReason => {
                console.log('Closing reason', closingReason)
                filerobotImageEditor.terminate()
              }
            })

            // window.p = Painterro({
            //     hideByEsc: true,
            //     saveByEnter: true,
            //     hiddenTools: [
            //         'open', 'close', 'resize', 'eraser'
            //     ],
            //     id: 'paint-wrapper',
            //     availableLineWidths: [1, 2, 4, 8, 16, 64],
            //     availableEraserWidths: [1, 2, 4, 8, 16, 64],
            //     availableFontSizes: [1, 2, 4, 8, 16, 64],
            //     availableArrowLengths: [10, 20, 30, 40, 50, 60],
            //     defaultTool: 'brush',
            //     saveHandler: (image, done) => {

            //         let newImgBase64 = image.asDataURL();

            //         let imgElements = document.getElementsByTagName('img');
            //         // loop through all img elements
            //         // for (let i = 0; i < imgElements.length; i++) {
            //         //     // replace image with cropped image
            //         //     imgElements[i].src = newImgBase64;
            //         // }

            //         for (let elem of imgElements) {
            //             elem.src = newImgBase64;
            //         }

            //         // trigger resize event in setTimeout
            //         setTimeout(function () {
            //             window.dispatchEvent(new Event('resize'));
            //         }, 100);

            //         showNotification('💾 Image saved successfully', '#ffffff', '#000000', settings);
            //         setTimeout(() => {
            //             if (settings.settings.toolbar_position === 'top') {
            //                 viewer.move(0, 50);
            //             }
            //         }, 100);

            //         winboxPaint.close();
            //         done(true);
            //     }
            // }).show(viewer.image.src);
          }
        },
        download: settings.settings.download && {
          show: isLocalFile ? 0 : 1,
          size: 'large',
          click: function () {
            download(viewer.image)
          }
        },
        upload: settings.settings.upload && {
          show: isLocalFile ? 0 : 1,
          size: 'large',
          click: function () {
            let uriString = getBase64Image(viewer.image)

            // get base64 part from string
            let base64 = uriString.split(',')[1]

            // create html element with text
            let x = document.createElement('div')
            // set flex
            x.style.display = 'flex'
            // set element inner html
            x.innerHTML = `<i class="gg-spinner"></i> Uploading image... Please wait`

            Toastify({
              node: x,
              duration: 999999,
              newWindow: true,
              close: false,
              gravity: settings.settings.notification_gravity, // `top` or `bottom`
              position: settings.settings.notification_position, // `left`, `center` or `right`
              stopOnFocus: true, // Prevents dismissing of toast on hover
              style: {
                color: '#ffffff',
                background: '#000000'
              }
              //onClick: function () { } // Callback after click
            }).showToast()

            // upload image to either imgbb or imgur, depending on the current setting
            switch (UPLOAD_SITE) {
              // upload to imgbb
              case 'imgbb':
                let formdata = new FormData()
                formdata.append('image', base64)

                let requestOptionsIMGBB = {
                  method: 'POST',
                  body: formdata,
                  redirect: 'follow'
                }

                fetch(`https://api.imgbb.com/1/upload?expiration=600&key=${IMGBB_TOKEN}`, requestOptionsIMGBB)
                  .then(res => res.json())
                  .then(res => {
                    // remove toast
                    let toastifyElems = document.querySelectorAll('.toastify')
                    toastifyElems.forEach(element => {
                      element.remove()
                    })

                    copyToClipboard(res.data.image.url)
                    showNotification('✔️ Image uploaded successfully', '#ffffff', '#000000', settings)
                    showNotification(`📋 URL copied to clipboard`, '#ffffff', '#000000', settings)
                  })
                break
              // upload to imgur
              case 'imgur':
                let requestOptionsIMGUR = {
                  method: 'POST',
                  headers: { 'Authorization': `Client-ID ${IMGUR_TOKEN}` },
                  body: base64
                }

                fetch('https://api.imgur.com/3/image', requestOptionsIMGUR)
                  .then(res => res.json())
                  .then((res) => {
                    // remove toast
                    let toastifyElems = document.querySelectorAll('.toastify');
                    toastifyElems.forEach(element => {
                        element.remove()
                    });
    
                    copyToClipboard(res.data.link);
                    showNotification('✔️ Image uploaded successfully', '#ffffff', '#000000', settings)
                    showNotification(`📋 URL copied to clipboard`, '#ffffff', '#000000', settings)
                  });
                break
            }
          }
        },
        colorpicker: settings.settings.colorpicker && {
          show: isLocalFile ? 0 : 1,
          size: 'large',
          click: async function () {
            if (!IS_PICKER_OPEN) {
              IS_PICKER_OPEN = true

              // change cursor to picker
              viewer.image.style.cursor = 'crosshair'

              let colorPickerBox = new WinBox('Color Preview', {
                class: WINBOX_CLASSES,
                background: 'rgba(0,0,0,0.9)',
                index: 9999,
                width: '250px',
                height: '250px',
                y: 'bottom',
                x: '10px',
                html: `
                            <div styles="padding: 10px">
                                <div class="color-picker"></div>
                            </div>`,
                onclose: function () {
                  IS_PICKER_OPEN = false
                  // change cursor back to default
                  viewer.image.style.cursor = 'default'
                  viewer.image.click() // trigger a click to remove the event listener
                }
              })

              // init color picker
              const pickr = Pickr.create({
                el: '.color-picker',
                inline: true,
                showAlways: true,
                theme: 'classic', // or 'monolith', or 'nano'
                useAsButton: false,
                autoReposition: true,
                appClass: 'color-picker-app',
                components: {
                  // Main components
                  preview: true,
                  opacity: false,
                  hue: true,

                  // Input / output Options
                  interaction: {
                    hex: true,
                    rgba: true,
                    hsla: true,
                    hsva: true,
                    cmyk: true,
                    input: true
                  }
                }
              })

              // auto size window
              let contentWidth = document.getElementsByClassName('pcr-app')[0].getBoundingClientRect().width
              let contentHeight = document.getElementsByClassName('pcr-app')[0].getBoundingClientRect().height
              colorPickerBox.resize(contentWidth + 8, contentHeight + 35) // TODO: use better way to get content height and width
              colorPickerBox.show()

              // create new canvas
              let canvas = document.createElement('canvas')
              canvas.style.display = 'none'

              let x = ''
              let y = ''

              // when image clicked
              viewer.image.addEventListener(
                'click',
                function (e) {
                  if (IS_PICKER_OPEN) {
                    handleImageClickOnPicker(e, viewer, canvas, pickr, x, y, settings)
                  } else {
                    this.removeEventListener('click', arguments.callee)
                  }
                },
                false
              )

              // when mouse move
              viewer.image.addEventListener(
                'mousemove',
                function (e) {
                  if (IS_PICKER_OPEN) {
                    handleMouseMoveOnPicker(e, viewer, canvas, pickr, x, y)
                  } else {
                    this.removeEventListener('mousemove', arguments.callee)
                  }
                },
                false
              )
            } else {
              return
            }
          }
        },
        details: settings.settings.details && {
          show: isLocalFile ? 0 : 1,
          size: 'large',
          click: async function () {
            if (!IS_DETAILS_OPEN) {
              IS_DETAILS_OPEN = true
              try {
                new WinBox('Details', {
                  class: [
                    //"no-scrollbar",
                    'no-max',
                    'no-min',
                    'no-full',
                    'no-resize',
                    'no-animation'
                  ],
                  index: 9999,
                  background: 'rgba(0,0,0,0.9)',
                  x: '20px',
                  y: '20px',
                  width: '350px',
                  height: '40%',
                  html: `<div id="details-wrapper"></div>`,
                  onclose: function () {
                    IS_DETAILS_OPEN = false
                  }
                })
              } catch (error) {
                console.error(error)
              }
            }

            let img2 = viewer.image

            const fileImg = await fetch(img2.src).then(r => r.blob())
            let fileSizeMB = fileImg.size / 1024 / 1024

            let imgDetails = {
              width: img2.naturalWidth,
              height: img2.naturalHeight,
              filesize: fileSizeMB.toFixed(2) + ' MB'
            }

            EXIF.getData(img2, function () {
              let allMetaData = EXIF.getAllTags(this)
              // add all metadata to wrapper
              // let wrapper = document.getElementById('details-wrapper');

              delete allMetaData.ImageWidth
              delete allMetaData.ImageHeight
              delete allMetaData.thumbnail

              allMetaData = { Width: imgDetails.width + 'px', Height: imgDetails.height + 'px', 'File size': imgDetails.filesize, ...allMetaData }

              let el = document.querySelector('#details-wrapper')
              el.innerHTML = jsonViewer(allMetaData, true)

              // convert to string
              //let metaDataString = JSON.stringify(allMetaData, null, "\t");

              // add string inside wrapper
              //wrapper.innerHTML = metaDataString;
            })
          }
        },
        theme: settings.settings.theme && {
          show: 1,
          size: 'large',
          click: function () {
            // blur --> light --> dark
            changeTheme(viewer.image.src, settings)
          }
        },
        print: settings.settings.print && {
          show: isLocalFile ? 0 : 1,
          size: 'large',
          click: function () {
            printImage(viewer.image)
          }
        },
        ocr: settings.settings.ocr && {
          show: 1,
          size: 'large',
          click: function () {
            let v = viewer
            let url = viewer.image.src
            let width = viewer.image.width
            let height = viewer.image.height

            let ocrPreviewBox = new WinBox('Image To Text: Select Region', {
              id: 'ocr-preview',
              class: WINBOX_CLASSES,
              modal: false,
              index: 9999,
              x: 'center',
              y: 'center',
              width: width + 7,
              height: height + 40,
              background: 'rgba(0,0,0,0.9)',
              html: `<div id="parent-crop"></div>`,
              onclose: function () {
                document.querySelector('#ocr-preview').remove()
                document.querySelector('#ocr-settings').remove()
              }
            })
            ocrPreviewBox.show()
            let ocrControlBox = new WinBox('Image To Text: Settings', {
              id: 'ocr-settings',
              class: WINBOX_CLASSES,
              modal: false,
              index: 9999,
              x: '10px',
              y: 'bottom',
              top: '10px',
              bottom: '10px',
              right: '10px',
              left: '10px',
              width: '250px',
              height: '160px',
              background: 'rgba(0,0,0,0.9)',
              html: `
                            <div class="ocr-controls">
                                <h5 class="ocr-title">Select Language</h5>
                                <div class="ocr-languages">
                                    <select class="select-dropdown" id="ocr-languages">
                                       
                                    </select>
                                </div>
                                <button id="btn-extract-text" class="ocr-button" role="button">Extract text</button>
                                
                            </div>`,
              onclose: function () {
                document.querySelector('#ocr-preview').remove()
                document.querySelector('#ocr-settings').remove()
                document.querySelector('#ocr-result-box').remove()
              }
            })
            ocrControlBox.show()
            let imgCropper = tinycrop.create({
              parent: '#parent-crop',
              image: url,
              bounds: {
                width: width,
                height: height
              },
              backgroundColors: ['#fff', '#f3f3f3'],
              selection: {
                color: '#212121CC',
                activeColor: '#ff0000CC',
                minWidth: 10,
                minHeight: 10,
                x: v.image.naturalWidth / 2 - width / 2,
                y: v.image.naturalHeight / 2 - height / 2,
                width: width,
                height: height
              },
              onInit: () => {
                console.log('Initialised')
              }
            })

            let region // contains the cropped region
            imgCropper.on('change', r => {
              region = r
            })

            Object.keys(ocrLangList).forEach(function (key) {
              let option = document.createElement('option')
              option.value = ocrLangList[key]
              option.text = key
              if (key == 'English') {
                option.selected = true
              }
              document.querySelector('#ocr-languages').appendChild(option)
            })
            // when btn-extract-text clicked
            document.getElementById('btn-extract-text').addEventListener('click', function () {
              // get selected language
              let selectedLang = document.querySelector('#ocr-languages').value

              const cropRect = region
              const canvas = document.createElement('canvas')
              const context = canvas.getContext('2d')
              const imageObj = new Image()
              canvas.width = cropRect.width
              canvas.height = cropRect.height
              imageObj.src = url

              imageObj.onload = function () {
                context.drawImage(imageObj, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height)
                let ImgUrl = canvas.toDataURL()

                console.log(ImgUrl)

                // create html element with text
                let x = document.createElement('div')
                // set flex
                x.style.display = 'flex'
                // set element inner html
                x.innerHTML = `<i class="gg-spinner"></i> Extracting Text`

                Toastify({
                  node: x,
                  duration: 999999,
                  newWindow: true,
                  close: false,
                  gravity: settings.settings.notification_gravity, // `top` or `bottom`
                  position: settings.settings.notification_position, // `left`, `center` or `right`
                  stopOnFocus: true, // Prevents dismissing of toast on hover
                  style: {
                    color: '#ffffff',
                    background: '#000000'
                  }
                }).showToast()

                // tesseract to ocr
                Tesseract.recognize(ImgUrl, selectedLang, { logger: m => console.log(m) }).then(({ data: { text } }) => {
                  // remove all toasts
                  let toastifyElems = document.querySelectorAll('.toastify')
                  toastifyElems.forEach(element => {
                    element.remove()
                  })

                  let ocrResElem = document.querySelector('#ocr-textarea')
                  if (ocrResElem) {
                    // if exists, then update
                    ocrResElem.innerHTML = text
                  } else {
                    // create new winbox

                    document.querySelector('#ocr-preview').remove()
                    document.querySelector('#ocr-settings').remove()

                    let ocrResultBox = new WinBox('Result', {
                      id: 'ocr-result-box',
                      class: WINBOX_CLASSES,
                      index: 9999,
                      width: '500px',
                      height: '320px',
                      top: '10px',
                      bottom: '10px',
                      right: '10px',
                      left: '10px',
                      x: 'center',
                      y: 'center',

                      background: 'rgba(0,0,0,0.9)',
                      html: `<div class="ocr-result">
                                        <textarea id="ocr-textarea" rows="10">${text}</textarea>
                                        <button id="btn-copytext" class="ocr-button" role="button">Copy to clipboard</button>
                                    </div>`
                    })

                    ocrResultBox.show()

                    // when btn-extract-text clicked
                    document.getElementById('btn-copytext').addEventListener('click', function () {
                      showNotification('📋 Copied to clipboard', '#ffffff', '#000000', settings)
                      copyToClipboard(document.querySelector('#ocr-textarea').value)
                    })
                  }
                })
              }
            })
            try {
            } catch (error) {
              console.error(error)
            }

            // // for each key in object ocr
            // for (const [key, value] of Object.entries(ocrLangList)) {
            //     console.log(`${key}: ${value}`);
            // }
          }
        },
        photopea: settings.settings.photopea && {
          show: isLocalFile ? 0 : 1,
          size: 'large',
          click: function () {
            let currentUrl = window.location.href
            // create html element with text
            let x = document.createElement('div')
            // set flex
            x.style.display = 'flex'
            // set element inner html
            x.innerHTML = `<i class="gg-spinner"></i> Opening in Photopea... Please wait`

            Toastify({
              node: x,
              duration: 999999,
              newWindow: true,
              close: false,
              gravity: settings.settings.notification_gravity, // `top` or `bottom`
              position: settings.settings.notification_position, // `left`, `center` or `right`
              stopOnFocus: true, // Prevents dismissing of toast on hover
              style: {
                color: '#ffffff',
                background: '#000000'
              }
            }).showToast()

            // upload image to imgbb
            // NB: expiration time is 60 seconds
            fetch(`https://api.imgbb.com/1/upload?expiration=60&key=${IMGBB_TOKEN}&image=${encodeURIComponent(currentUrl)}`)
              .then(res => res.json())
              .then(res => {
                const uri = '{ "files" : [ "' + res.data.image.url + '" ] }'
                const encoded = encodeURI(uri)
                const urlEncoded = 'https://www.photopea.com/#' + encoded
                // remove toast
                let toastifyElems = document.querySelectorAll('.toastify')
                toastifyElems.forEach(element => {
                  element.remove()
                })

                window.open(urlEncoded, '_blank').focus()

                showNotification(`📂 Image opened in Photopea successfully`, '#ffffff', '#000000', settings)
              })
          }
        },
        tineye: settings.settings.tineye && {
          show: isLocalFile ? 0 : 1,
          size: 'large',
          click: function () {
            // toastify
            let x = document.createElement('div')
            // set flex
            x.style.display = 'flex'
            // set element inner html
            x.innerHTML = `<i class="gg-spinner"></i> Opening in TinEye... Please wait`

            Toastify({
              node: x,
              duration: 1000,
              newWindow: true,
              close: false,
              gravity: settings.settings.notification_gravity, // `top` or `bottom`
              position: settings.settings.notification_position, // `left`, `center` or `right`
              stopOnFocus: true, // Prevents dismissing of toast on hover
              style: {
                color: '#ffffff',
                background: '#000000'
              }
            }).showToast()

            setTimeout(function () {
              let currentUrl = encodeURIComponent(window.location.href)
              let action_url = 'http://tineye.com/search?url=' + currentUrl
              window.open(action_url, '_blank').focus()
            }, 1000)
          }
        },
        qr: settings.settings.qr && {
          show: isLocalFile ? 0 : 1,
          size: 'large',
          click: function () {
            // show loading toast
            let x = document.createElement('div')
            // set flex
            x.style.display = 'flex'
            // set element inner html
            x.innerHTML = `<i class="gg-spinner"></i> Scanning QR code... Please wait`

            Toastify({
              node: x,
              duration: 9999,
              newWindow: true,
              close: false,
              gravity: settings.settings.notification_gravity, // `top` or `bottom`
              position: settings.settings.notification_position, // `left`, `center` or `right`
              stopOnFocus: true, // Prevents dismissing of toast on hover
              style: {
                color: '#ffffff',
                background: '#000000'
              }
            }).showToast()

            // remove loading toast
            setTimeout(function () {
              let toastifyElems = document.querySelectorAll('.toastify')
              toastifyElems.forEach(element => {
                element.remove()
              })

              qrcode.callback = function (res) {
                if (res instanceof Error) {
                  showNotification(`❌ No QR code found.`, '#ffffff', '#000000', settings)
                } else {
                  //alert(res);
                  // show winbox

                  let ocrResultBox = new WinBox('QR Code Result', {
                    id: 'ocr-result-box',
                    class: WINBOX_CLASSES,
                    index: 9999,
                    width: '500px',
                    height: '165px',
                    top: '10px',
                    bottom: '10px',
                    right: '10px',
                    left: '10px',
                    x: 'center',
                    y: 'center',
                    background: 'rgba(0,0,0,0.9)',
                    html: `
                                        <div class="ocr-result">
                                            <textarea id="qr-textarea" rows="5">${res}</textarea>
                                            <button id="btn-copytext" class="ocr-button" role="button">Copy to clipboard</button>
                                        </div>`
                  })

                  ocrResultBox.show()

                  // when btn-extract-text clicked
                  document.getElementById('btn-copytext').addEventListener('click', function () {
                    showNotification('📋 Copied to clipboard', '#ffffff', '#000000', settings)
                    copyToClipboard(document.querySelector('#qr-textarea').value)
                  })
                }
              }
              let b64Img = getBase64Image(viewer.image)
              qrcode.decode(b64Img)
            }, 500)
          }
        },
        help: settings.settings.help && {
          show: 1,
          size: 'large',
          click: function () {
            if (!IS_HELP_OPEN) {
              IS_HELP_OPEN = true

              try {
                new WinBox('Help', {
                  class: WINBOX_CLASSES,
                  index: 9999,
                  x: 'center',
                  y: 'center',
                  top: '10px',
                  bottom: '10px',
                  right: '10px',
                  left: '10px',
                  width: '700px',
                  height: '423px',
                  background: 'rgba(0,0,0,0.9)',
                  url: 'https://www.youtube-nocookie.com/embed/3p7Jrdx2jOc?autoplay=1&color=white&controls=0&disablekb=1&loop=1&modestbranding=1&rel=0&mute=1',
                  onclose: function () {
                    IS_HELP_OPEN = false
                  }
                })

                new WinBox('Shortcuts', {
                  class: WINBOX_CLASSES,
                  index: 9999,
                  x: 'right',
                  y: 'center',
                  top: '10px',
                  bottom: '10px',
                  right: '10px',
                  left: '10px',
                  width: '550px',
                  height: '90%',
                  background: 'rgba(0,0,0,0.9)',
                  url: chrome.runtime.getURL('pages/shortcuts.html'),
                  onclose: function () {
                    IS_HELP_OPEN = false
                  }
                })
              } catch (error) {
                console.error(error)
              }
            }
          }
        },
        settings: settings.settings.settings && {
          show: 1,
          size: 'large',
          click: function () {
            // open winbox
            try {
              new WinBox('Settings', {
                class: WINBOX_CLASSES,
                index: 9999,
                x: 'center',
                y: 'center',
                top: '10px',
                bottom: '10px',
                right: '10px',
                left: '10px',
                width: '350px',
                height: '400px',
                background: 'rgba(0,0,0,0.9)',
                url: chrome.runtime.getURL('pages/settings.html')
              })
            } catch (error) {
              console.error(error)
            }
          }
        },
        about: settings.settings.about && {
          show: 1,
          size: 'large',
          click: function () {
            try {
              new WinBox('About', {
                class: WINBOX_CLASSES,
                index: 9999,
                x: 'center',
                y: 'center',
                width: '700px',
                height: '500px',
                background: 'rgba(0,0,0,0.9)',
                url: chrome.runtime.getURL('pages/about.html')
              })
            } catch (error) {
              console.error(error)
            }
          }
        },
        exit: settings.settings.exit && {
          show: 1,
          size: 'large',
          click: function () {
            let url = window.location.href
            viewer.destroy()
            document.querySelector('.blurry-bg').remove()
            document.querySelector('img').style.display = 'block'
            document.querySelectorAll('.winbox').forEach(function (el) {
              el.remove()
            })
            // remove all style tags
            let styleTags = document.querySelectorAll('style')
            styleTags.forEach(function (el) {
              el.remove()
            })
            document.querySelector('img').src = url
          }
        },
        more: {
          show: 1,
          size: 'large',
          click: function () {
            // get all viewer buttons
            let viewerButtons = document.querySelectorAll('div.viewer-toolbar > ul > li')

            let btnsExceptMore = Array.prototype.slice.call(viewerButtons).filter(function (el) {
              return !el.classList.contains('viewer-more')
            })

            btnsExceptMore.forEach(btn => {
              // toggle display of each button

              let cssObj = window.getComputedStyle(btn, null)
              let display = cssObj.getPropertyValue('display')

              if (display === 'none') {
                btn.style.display = 'list-item'
                btn.style.opacity = 1
                // append class
                btn.classList.add('fade-in-right')
              } else {
                btn.style.display = 'none'
                btn.style.opacity = 0
              }
            })
          }
        }
      },
      ready() {
        // hide all at start
        if (settings.settings.hide_all_at_start) {
          // get all viewer buttons
          let viewerButtons = document.querySelectorAll('div.viewer-toolbar > ul > li')

          let btnsExceptMore = Array.prototype.slice.call(viewerButtons).filter(function (el) {
            return !el.classList.contains('viewer-more')
          })

          btnsExceptMore.forEach(btn => {
            // toggle display of each button

            let cssObj = window.getComputedStyle(btn, null)
            let display = cssObj.getPropertyValue('display')

            if (display === 'none') {
              btn.style.display = 'list-item'
              btn.style.opacity = 1
              // append class
              btn.classList.add('fade-in-right')
            } else {
              btn.style.display = 'none'
              btn.style.opacity = 0
            }
          })
        }

        setTimeout(() => {
          if (settings.settings.toolbar_position === 'top') {
            viewer.move(0, 50)
          }
        }, 100)
      }
    })

    let lightTheme = `
        transition: all 0.5s ease;
        background-image: none;
        background-color: #ffffff;
        filter: blur(0px);
        -webkit-filter: blur(0px);
        height: 100%;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
        width: 100vw;
        height: 100vh;
        transform: scale(1.3);
        `

    let darktheme = `
        transition: all 0.5s ease;
        background-image: none;
        background-color: #0e1217;
        filter: blur(0px);
        -webkit-filter: blur(0px);
        height: 100%;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
        width: 100vw;
        height: 100vh;
        transform: scale(1.3);
        opacity: 0;
        `

    let blurrytheme = `
        transition: none;
        background-image: url(${imgElement.src});
        background-color: none;
        filter: blur(15px);
        -webkit-filter: blur(15px);
        height: 100%;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
        width: 100vw;
        height: 100vh;
        transform: scale(1.3);
        opacity: 1;
        `

    let currentTheme = bg => {
      if (bg === 'light') {
        return lightTheme
      } else if (bg === 'dark') {
        return darktheme
      }
      return blurrytheme
    }

    // inject css
    injectCSS(`
            .blurry-bg {
                ${currentTheme(BACKGROUND_TYPE)}
            }
            /* Make blur darker */
            .blurry-bg:before {
                content: '';
                background-color: #000;
                opacity: ${BACKGROUND_TYPE === 'blurred' ? 0.5 : 0};
                width: 100%;
                height: 100%;
                z-index: 1;
                position: absolute;
                top: 0;
                left: 0;
            }
            img{
                display: none
            }
            .viewer-footer {
                bottom: ${settings.settings.toolbar_position === 'bottom' ? '0px' : 'unset'} !important;
                top: ${settings.settings.toolbar_position === 'top' ? '10px' : 'unset'} !important;
            }
            `)

    // show the viewer
    viewer.show()

    setTippyText(tippyData)
  }
}

/**
 * Helper function - converts an svg element to a base64 string
 * @param {svgElement} svgElement the svg element to convert
 * @returns
 */
function svgToBase64(svgElement) {
  let svgString = new XMLSerializer().serializeToString(svgElement)
  let decoded = unescape(encodeURIComponent(svgString))
  let base64 = btoa(decoded)
  return `data:image/svg+xml;base64,${base64}`
}

/**
 * Injects css into the page
 * @param {string} css string to inject
 * @returns
 */
function injectCSS(css) {
  let head = document.getElementsByTagName('head')[0]
  if (!head) {
    return
  }
  let style = document.createElement('style')
  style.innerHTML = DOMPurify.sanitize(css)
  head.appendChild(style)
}

/**
 * tippy.js text - add tooltips to viewer's toolbar
 * @param {*} arrBtns array Of Buttons
 */
function setTippyText(arrBtns) {
  window.tippyInstances = []

  arrBtns.forEach(function (item) {
    let instances = tippy(`#viewer0 > div.viewer-footer > div.viewer-toolbar > ul > li.viewer-${item.type}.viewer-large`, {
      content: item.text,
      inertia: true,
      animation: 'scale',
      theme: 'dark'
    })
    window.tippyInstances = tippyInstances.concat(instances)
  })
}

/**
 * Download image
 * @param {HTMLElement} image Viewer Image
 */
function download(image) {
  const a = document.createElement('a')
  a.href = image.src
  a.download = image.alt
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 *
 * @param {viewer} viewer
 * @param {string} url
 * @param {*} width
 * @param {*} height
 */
function crop(v, url, width, height) {
  // create new winbox
  let winbox = new WinBox('Crop Image', {
    id: 'winbox-crop-image',
    class: WINBOX_CLASSES,

    width: width + 7,
    // height + 10%
    height: height + 40 + 36,
    x: 'center',
    y: 'center',
    index: 9999,
    background: 'rgba(0,0,0,0.9)',
    html: `
        <div id="parent-crop"></div>
        <button id="btn-crop-img" class="ocr-button crop-btn" style="margin: 0px;" role="button">✂️ Crop</button>
        `,
    onclose: function () {
      // reset viewer zoom
      //  v.zoom(0.5);
      IS_CROP_OPEN = false
    }
  })

  let imgCropper = tinycrop.create({
    parent: '#parent-crop',
    image: url,
    bounds: {
      width: width,
      height: height
    },
    backgroundColors: ['#fff', '#f3f3f3'],
    selection: {
      color: '#212121CC',
      activeColor: '#ff0000CC',
      minWidth: 10,
      minHeight: 10,
      x: v.image.naturalWidth / 2 - width / 2,
      y: v.image.naturalHeight / 2 - height / 2,
      width: width,
      height: height
    },
    onInit: () => {
      console.log('Initialised')
    }
  })

  let region // contains the cropped region
  imgCropper.on('change', r => {
    console.log('change', r)
    region = r
  })

  // const image = document.getElementById('crop-img');

  setTimeout(function () {
    // get crop btn and add event listener
    let cropBtn = document.getElementById('btn-crop-img')

    cropBtn.addEventListener('click', function () {
      const cropRect = region
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      const imageObj = new Image()
      canvas.width = cropRect.width
      canvas.height = cropRect.height
      imageObj.src = url
      imageObj.onload = function () {
        context.drawImage(imageObj, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height)
        let ImgUrl = canvas.toDataURL()
        v.image.src = ImgUrl

        switch (BACKGROUND_TYPE) {
          case 'blurred':
            injectCSS(`
                        .blurry-bg {
                            background-image: url("${ImgUrl}");
                        }`)
            break
          case 'light':
            break
          case 'dark':
            break
          default:
            break
        }

        setTimeout(function () {
          window.dispatchEvent(new Event('resize'))
          IS_CROP_OPEN = false
          winbox.close()
        }, 100)
      }

      // image.addEventListener('load', () => {

      //     console.log(image)
      //     context.drawImage(
      //         //croppr.imageEl,
      //         v.element,
      //         cropRect.x,
      //         cropRect.y,
      //         cropRect.width,
      //         cropRect.height,
      //         0,
      //         0,
      //         canvas.width,
      //         canvas.height,
      //     );
      // });

      //

      //v.image.src = ImgUrl;

      // switch (BACKGROUND_TYPE) {
      //     case 'blurred':
      //         injectCSS(`
      //         .blurry-bg {
      //             background-image: url("${ImgUrl}");
      //         }`);
      //         break;
      //     case 'light':
      //         break;
      //     case 'dark':
      //         break;
      //     default:
      //         break;
      // }

      // setTimeout(function () {
      //     v.zoom(0.5);
      //     window.dispatchEvent(new Event('resize'));
      // }, 100);

      // //showNotification("Image cropped successfully", '#ffffff', '#000000', settings)
      // IS_CROP_OPEN = false;
      // winbox.close();
    })
  }, 100)
}

// canvas function
function useCanvas(el, image, callback) {
  el.width = image.width // img width
  el.height = image.height // img height
  // draw image in canvas tag
  el.getContext('2d').drawImage(image, 0, 0, image.width, image.height)
  return callback()
}

function componentToHex(c) {
  let hex = c.toString(16)
  return hex.length == 1 ? '0' + hex : hex
}
function rgbToHex(r, g, b) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b)
}

function findPos(obj) {
  let curleft = 0,
    curtop = 0
  if (obj.offsetParent) {
    do {
      curleft += obj.offsetLeft
      curtop += obj.offsetTop
    } while ((obj = obj.offsetParent))
    return { x: curleft, y: curtop }
  }
  return undefined
}

function resetColorPicker(winboxPicker, v) {
  //console.log(e);
}

const handleImageClickOnPicker = (e, v, canvas, pickr, x, y, settings) => {
  if (e.offsetX) {
    x = e.offsetX
    y = e.offsetY
  }

  console.log(settings)

  useCanvas(canvas, v.image, () => {
    // get image data
    let p = canvas.getContext('2d').getImageData(x, y, 1, 1).data
    // show info
    pickr.setColor(rgbToHex(p[0], p[1], p[2]))
    copyToClipboard(rgbToHex(p[0], p[1], p[2]))
    showNotification(`${rgbToHex(p[0], p[1], p[2]).toUpperCase()} copied to clipboard`, getColorByBgColor(rgbToHex(p[0], p[1], p[2])), rgbToHex(p[0], p[1], p[2]), settings)
  })
}

const handleMouseMoveOnPicker = (e, v, canvas, pickr, x, y) => {
  if (e.offsetX) {
    x = e.offsetX
    y = e.offsetY
  }
  useCanvas(canvas, v.image, function () {
    // get image data
    let p = canvas.getContext('2d').getImageData(x, y, 1, 1).data
    pickr.setColor(rgbToHex(p[0], p[1], p[2]))
  })
}

/**
 * Get color (black/white) depending on bgColor so it would be clearly seen.
 * @param {string} bgColor
 * @returns {string}
 */
function getColorByBgColor(bgColor) {
  if (!bgColor) {
    return ''
  }
  return parseInt(bgColor.replace('#', ''), 16) > 0xffffff / 2 ? '#000' : '#fff'
}

/**
 * Copy string to clipboard
 * @param {string} str - string to copy
 */
function copyToClipboard(textToCopy) {
  // navigator clipboard api needs a secure context (https)
  if (navigator.clipboard && window.isSecureContext) {
    // navigator clipboard api method'
    return navigator.clipboard.writeText(textToCopy)
  } else {
    // text area method
    let textArea = document.createElement('textarea')
    textArea.value = textToCopy
    // make the textarea out of viewport
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    return new Promise((res, rej) => {
      // here the magic happens
      document.execCommand('copy') ? res() : rej()
      textArea.remove()
    })
  }
}

function printImage(image) {
  let strb64 = getBase64Image(image)
  printJS(strb64, 'image')
}

/**
 * Convert image to base64
 * @param {*} img Image element
 * @returns
 */
function getBase64Image(img) {
  let canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  let ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  return canvas.toDataURL()
}

function changeTheme(imgsrc, settings) {
  let lightTheme = `background-image: url("data:image/svg+xml,%0A%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-sun'%3E%3Ccircle cx='12' cy='12' r='5'%3E%3C/circle%3E%3Cline x1='12' y1='1' x2='12' y2='3'%3E%3C/line%3E%3Cline x1='12' y1='21' x2='12' y2='23'%3E%3C/line%3E%3Cline x1='4.22' y1='4.22' x2='5.64' y2='5.64'%3E%3C/line%3E%3Cline x1='18.36' y1='18.36' x2='19.78' y2='19.78'%3E%3C/line%3E%3Cline x1='1' y1='12' x2='3' y2='12'%3E%3C/line%3E%3Cline x1='21' y1='12' x2='23' y2='12'%3E%3C/line%3E%3Cline x1='4.22' y1='19.78' x2='5.64' y2='18.36'%3E%3C/line%3E%3Cline x1='18.36' y1='5.64' x2='19.78' y2='4.22'%3E%3C/line%3E%3C/svg%3E");`
  let darkTheme = `background-image: url("data:image/svg+xml,%0A%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-moon'%3E%3Cpath d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'%3E%3C/path%3E%3C/svg%3E");`
  let blurTheme = `background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-droplet'%3E%3Cpath d='M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z'%3E%3C/path%3E%3C/svg%3E"); `

  switch (BACKGROUND_TYPE) {
    case 'blurred':
      showNotification('☀️ Light Background', '#000000', '#ffffff', settings)
      injectCSS(`
                .viewer-theme {
                    ${darkTheme}
                }
                .blurry-bg {
                            transition: all 0.5s ease;
                            background-image: none;
                            background-color: #ffffff;
                            filter: blur(0px);
                            -webkit-filter: blur(0px);
                            height: 100%;
                            background-position: center;
                            background-repeat: no-repeat;
                            background-size: cover;
                            width: 100vw;
                            height: 100vh;
                            transform: scale(1.3); 
                }
                .blurry-bg:before {
                    opacity: 0;
                }
                
                `)
      BACKGROUND_TYPE = 'light'
      break
    case 'light':
      showNotification('🌑 Dark Background', '#ffffff', '#000000', settings)
      injectCSS(`
            .viewer-theme {
                ${blurTheme}
            }
            .blurry-bg {
                        transition: all 0.5s ease;
                        background-image: none;
                        background-color: #0e1217;
                        filter: blur(0px);
                        -webkit-filter: blur(0px);
                        height: 100%;
                        background-position: center;
                        background-repeat: no-repeat;
                        background-size: cover;
                        width: 100vw;
                        height: 100vh;
                        transform: scale(1.3); 
                        opacity: 0;
            }
            .blurry-bg:before {
                opacity: 0;
            }
            `)
      BACKGROUND_TYPE = 'dark'
      break
    case 'dark':
      // change to blurred
      showNotification('💧 Blurred Background', '#ffffff', '#404040', settings)
      injectCSS(`
            .viewer-theme {
                ${lightTheme}
            }
            .blurry-bg {
                transition: none;
                background-image: url("${imgsrc}");
                background-color: none;
                filter: blur(15px);
                -webkit-filter: blur(15px);
                height: 100%;
                background-position: center;
                background-repeat: no-repeat;
                background-size: cover;
                width: 100vw;
                height: 100vh;
                transform: scale(1.3); 
                opacity: 1;
            }
            .blurry-bg:before {
                opacity: 0.5;
            }`)
      BACKGROUND_TYPE = 'blurred'
      break
  }
}

function showNotification(text, textColor, bgColor, settings) {
  Toastify({
    text: `${text}`,
    duration: 3000,
    newWindow: true,
    close: false,
    gravity: settings.settings.notification_gravity, // `top` or `bottom`
    position: settings.settings.notification_position, // `left`, `center` or `right`
    stopOnFocus: true, // Prevents dismissing of toast on hover
    style: {
      color: textColor,
      background: bgColor
    }
  }).showToast()
}

// hardcoded toast position for the shortcut.html save button -- fix if possible
function showNotificationShortcuts(text, textColor, bgColor) {

    Toastify({
        text: `${text}`,
        duration: 3000,
        newWindow: true,
        close: false,
        gravity: 'top', // `top` or `bottom`
        position: 'right', // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            color: textColor,
            background: bgColor,
        }
    }).showToast();
}


function jsonViewer(json, collapsible = false) {
  let TEMPLATES = {
    item: '<div class="json__item"><div class="json__key">%KEY%</div><div class="json__value json__value--%TYPE%">%VALUE%</div></div>',
    itemCollapsible: '<label class="json__item json__item--collapsible"><input type="checkbox" class="json__toggle"/><div class="json__key">%KEY%</div><div class="json__value json__value--type-%TYPE%">%VALUE%</div>%CHILDREN%</label>',
    itemCollapsibleOpen: '<label class="json__item json__item--collapsible"><input type="checkbox" checked class="json__toggle"/><div class="json__key">%KEY%</div><div class="json__value json__value--type-%TYPE%">%VALUE%</div>%CHILDREN%</label>'
  }

  function createItem(key, value, type) {
    let element = TEMPLATES.item.replace('%KEY%', key)

    if (type == 'string') {
      element = element.replace('%VALUE%', '"' + value + '"')
    } else {
      element = element.replace('%VALUE%', value)
    }

    element = element.replace('%TYPE%', type)

    return element
  }

  function createCollapsibleItem(key, value, type, children) {
    let tpl = 'itemCollapsible'

    if (collapsible) {
      tpl = 'itemCollapsibleOpen'
    }

    let element = TEMPLATES[tpl].replace('%KEY%', key)

    element = element.replace('%VALUE%', type)
    element = element.replace('%TYPE%', type)
    element = element.replace('%CHILDREN%', children)

    return element
  }

  function handleChildren(key, value, type) {
    let html = ''

    for (let item in value) {
      let _key = item,
        _val = value[item]

      html += handleItem(_key, _val)
    }

    return createCollapsibleItem(key, value, type, html)
  }

  function handleItem(key, value) {
    let type = typeof value

    if (typeof value === 'object') {
      return handleChildren(key, value, type)
    }

    return createItem(key, value, type)
  }

  function parseObject(obj) {
    let _result = '<div class="json">'

    for (let item in obj) {
      let key = item,
        value = obj[item]

      _result += handleItem(key, value)
    }

    _result += '</div>'

    return _result
  }

  return parseObject(json)
}

// listen to messages from iframe
window.addEventListener('message', function (message) {
    if (message.data.type == "settings") {
        let user_settings = message.data.settings
        // save using chrome.storage
        chrome.storage.sync.set({
            settings: user_settings
        }, function () {
            // Notify that we saved.
            showNotification('💾 Settings saved successfully', '#ffffff', '#000000', message.data);
            setTimeout(() => {
                // reload window after saving
                window.location.reload();
            }, 1000)
        });
    };

    if (message.data.type == "shortcutHotkeys") {
        let user_shortcutHotkeys = message.data.shortcutHotkeys
        // save using chrome.storage
        chrome.storage.sync.set({
            shortcutHotkeys: user_shortcutHotkeys,
        }, function () {
            // Notify that we saved.
            showNotificationShortcuts('💾 Shortcuts saved successfully', '#ffffff', '#000000', message.data);
            setTimeout(() => {
                // reload window after saving
                window.location.reload();
            }, 1000)
        });
    };
});



