// run when scripts and styles are loaded
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type == "injected") {
        console.log("Image Viewer Extension loaded...");
        init();
    }
});

let IS_PICKER_OPEN = false;
let IS_DETAILS_OPEN = false;
let IS_HELP_OPEN = false;
let IS_CROP_OPEN = false;
let BACKGROUND_TYPE = "blurred";
let ImgCanvas;
let isFlippedHorizontally = false;
let isFlippedVertically = false;
let IMGUR_TOKEN = '405d491c9e67e9f';
let WINBOX_CLASSES = [
    "no-scrollbar",
    "no-max",
    "no-min",
    "no-full",
    "no-resize",
    "no-animation"
]
var ocrLangList = {
    'Afrikaans': 'afr',
    'Albanian': 'sqi',
    'Amharic': 'amh',
    'Arabic': 'ara',
    'Armenian': 'hye',
    'Azerbaijani': 'aze',
    'Basque': 'eus',
    'Belarusian': 'bel',
    'Bengali': 'ben',
    'Bosnian': 'bos',
    'Bulgarian': 'bul',
    'Burmese': 'mya',
    'Catalan': 'cat',
    'Cebuano': 'ceb',
    'Chinese Simplified': 'chi_sim',
    'Chinese Simplified (vertical)': 'chi_sim_vert',
    'Chinese Traditional': 'chi_tra',
    'Chinese Traditional (vertical)': 'chi_tra_vert',
    'Corsican': 'cos',
    'Croatian': 'hrv',
    'Czech': 'ces',
    'Danish': 'dan',
    'Dutch': 'nld',
    'English': 'eng',
    'Esperanto': 'epo',
    'Estonian': 'est',
    'Filipino': 'fil',
    'Finnish': 'fin',
    'French': 'fra',
    'Frisian': 'fry',
    'Galician': 'glg',
    'Georgian': 'kat',
    'German': 'deu',
    'Greek': 'ell',
    'Gujarati': 'guj',
    'Haitian': 'hat',
    'Hebrew': 'heb',
    'Hindi': 'hin',
    'Hungarian': 'hun',
    'Icelandic': 'isl',
    'Indonesian': 'ind',
    'Irish': 'gle',
    'Italian': 'ita',
    'Japanese': 'jpn',
    'Japanese (vertical)': 'jpn_vert',
    'Javanese': 'jav',
    'Kannada': 'kan',
    'Kazakh': 'kaz',
    'Khmer': 'khm',
    'Korean': 'kor',
    'Korean (vertical)': 'kor_vert',
    'Kurdish': 'kmr',
    'Lao': 'lao',
    'Latin': 'lat',
    'Latvian': 'lav',
    'Lithuanian': 'lit',
    'Luxembourgish': 'ltz',
    'Macedonian': 'mkd',
    'Malay': 'msa',
    'Malayalam': 'mal',
    'Maltese': 'mlt',
    'Maori': 'mri',
    'Marathi': 'mar',
    'Mongolian': 'mon',
    'Nepali': 'nep',
    'Norwegian': 'nor',
    'Persian': 'fas',
    'Polish': 'pol',
    'Portuguese': 'por',
    'Romanian': 'ron',
    'Russian': 'rus',
    'Scottish Gaelic': 'gla',
    'Serbian': 'srp',
    'Sindhi': 'snd',
    'Sinhala': 'sin',
    'Slovak': 'slk',
    'Slovenian': 'slv',
    'Spanish': 'spa',
    'Sundanese': 'sun',
    'Swahili': 'swa',
    'Swedish': 'swe',
    'Tajik': 'tgk',
    'Tamil': 'tam',
    'Telugu': 'tel',
    'Thai': 'tha',
    'Turkish': 'tur',
    'Ukrainian': 'ukr',
    'Urdu': 'urd',
    'Uzbek': 'uzb',
    'Vietnamese': 'vie',
    'Welsh': 'cym',
    'Yiddish': 'yid',
    'Yoruba': 'yor'
};
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
        type: 'rotate-left',
        text: 'Rotate Left',
    },
    {
        type: 'rotate-right',
        text: 'Rotate Right',
    },
    {
        type: 'flip-horizontal',
        text: 'Flip Horizontal',
    },
    {
        type: 'flip-vertical',
        text: 'Flip Vertical',
    },
    {
        type: 'crop',
        text: 'Crop Image',
    },
    {
        type: 'download',
        text: 'Download',
    },
    {
        type: 'play',
        text: 'Fullscreen',
    },
    {
        type: 'details',
        text: 'Details',
    },
    {
        type: 'colorpicker',
        text: 'Color Picker',
    },
    {
        type: 'paint',
        text: 'Paint',
    },
    {
        type: 'print',
        text: 'Print image',
    },
    {
        type: 'help',
        text: 'Help',
    },
    {
        type: 'theme',
        text: 'Toggle Theme',
    },
    {
        type: 'exit',
        text: 'Turn Off',
    },
    {
        type: 'upload',
        text: 'Upload image to Imgur',
    },
    {
        type: 'ocr',
        text: 'Extract Text',
    },
    {
        type: 'photopea',
        text: 'Edit in Photopea',
    },
    {
        type: 'about',
        text: 'About',
    },
]

/**
 * when key is pressed
 */
document.addEventListener('keydown', function (e) {

    // switch case by keycode
    switch (e.key) {
        case '0':
            document.getElementsByClassName('viewer-reset')[0].click();
            break;
        case '1':
            document.getElementsByClassName('viewer-one-to-one')[0].click();
            break;
        case 'S':
        case 's':
            document.getElementsByClassName('viewer-download')[0].click();
            break;
        case '+':
            document.getElementsByClassName('viewer-zoom-in')[0].click();
            break;
        case '-':
            document.getElementsByClassName('viewer-zoom-out')[0].click();
            break;
        case 'ArrowLeft':
            document.getElementsByClassName('viewer-rotate-left')[0].click();
            break;
        case 'ArrowRight':
            document.getElementsByClassName('viewer-rotate-right')[0].click();
            break;
        case 'A':
        case 'a':
            document.getElementsByClassName('viewer-flip-horizontal')[0].click();
            break;
        case 'Q':
        case 'q':
            document.getElementsByClassName('viewer-flip-vertical')[0].click();
            break;
        case 'X':
        case 'x':
            document.getElementsByClassName('viewer-crop')[0].click();
            break;
        case 'P':
        case 'p':
            document.getElementsByClassName('viewer-paint')[0].click();
            break;
        case 'C':
        case 'c':
            document.getElementsByClassName('viewer-colorpicker')[0].click();
            break;
        case 'D':
        case 'd':
            document.getElementsByClassName('viewer-details')[0].click();
            break;
        case 'H':
        case 'h':
            document.getElementsByClassName('viewer-help')[0].click();
            break;
        case 'F':
        case 'f':
            document.getElementsByClassName('viewer-play')[0].click();
            break;
        case 'M':
        case 'm':
            document.getElementsByClassName('viewer-print')[0].click();
            break;
        case 'T':
        case 't':
            document.getElementsByClassName('viewer-theme')[0].click();
            break;
        case 'E':
        case 'e':
            document.getElementsByClassName('viewer-exit')[0].click();
            break;
        case 'U':
        case 'u':
            document.getElementsByClassName('viewer-upload')[0].click();
            break;
        case 'G':
        case 'g':
            document.getElementsByClassName('viewer-photopea')[0].click();
            break;
        case 'W':
        case 'w':
            document.getElementsByClassName('viewer-ocr')[0].click();
            break;
        default:
            break;
    }

});


/**
 * Initializes the extension
 */
function init() {

    let imgElement = document.getElementsByTagName('img')[0]; // get img element
    // if img element is found
    if (imgElement) {

        let blurryDiv = document.createElement('div'); // create blurry div
        blurryDiv.setAttribute('class', 'blurry-bg'); // add class to blurry div
        imgElement.parentNode.insertBefore(blurryDiv, imgElement); // add before img element


        // init Viewer
        const viewer = new Viewer(imgElement, {
            inline: false,
            loading: false,
            interval: 0,
            zoomable: true,
            transition: false,
            navbar: false,
            title: false,
            keyboard: false,
            backdrop: false, // prevent exit when click backdrop
            toolbar: {
                zoomIn: {
                    show: 1,
                    size: 'large',
                },
                zoomOut: {
                    show: 1,
                    size: 'large',
                },
                oneToOne: {
                    show: 1,
                    size: 'large',
                },
                reset: {
                    show: 1,
                    size: 'large',
                    click: function () {
                        viewer.image.src = window.location.href;
                        viewer.reset();
                        window.dispatchEvent(new Event('resize'));
                    }
                },
                prev: false,
                play: {
                    show: 1,
                    size: 'large',
                    click: function () {
                        viewer.image.requestFullscreen()
                            .then(function () {
                            })
                            .catch(function (error) {
                            });
                    }
                },
                next: false,
                rotateLeft: {
                    show: 1,
                    size: 'large',
                },
                rotateRight: {
                    show: 1,
                    size: 'large',
                },
                flipHorizontal: {
                    show: 1,
                    size: 'large',
                },
                flipVertical: {
                    show: 1,
                    size: 'large',
                },
                crop: {
                    show: 1,
                    size: 'large',
                    click: function () {
                        if (!IS_CROP_OPEN) {
                            IS_CROP_OPEN = true;
                            crop(viewer, viewer.image.src, viewer.image.width, viewer.image.height);
                        }

                    }
                },
                paint: {
                    show: 1,
                    size: 'large',
                    click: function () {

                        // create new winbox
                        let winboxPaint = new WinBox("Paint", {
                            class: WINBOX_CLASSES,
                            index: 9999,
                            x: "center",
                            y: "center",
                            width: '90%',
                            height: '90%',
                            background: "rgba(0,0,0,0.9)",
                            index: 9999,
                            html: `<div id="paint-wrapper"></div>`,
                        });

                        winboxPaint.show();


                        window.p = Painterro({
                            hideByEsc: true,
                            saveByEnter: true,
                            hiddenTools: [
                                'open', 'close', 'resize', 'eraser'
                            ],
                            id: 'paint-wrapper',
                            availableLineWidths: [1, 2, 4, 8, 16, 64],
                            availableEraserWidths: [1, 2, 4, 8, 16, 64],
                            availableFontSizes: [1, 2, 4, 8, 16, 64],
                            availableArrowLengths: [10, 20, 30, 40, 50, 60],
                            defaultTool: 'brush',
                            saveHandler: (image, done) => {

                                let newImgBase64 = image.asDataURL();

                                let imgElements = document.getElementsByTagName('img');
                                // loop through all img elements
                                for (let i = 0; i < imgElements.length; i++) {
                                    // replace image with cropped image
                                    imgElements[i].src = newImgBase64;
                                }
                                // update blurry background
                                //document.getElementsByClassName('blurry-bg')[0].style.backgroundImage = `url("${newImgBase64}")`;
                                // update cropper-wrap-box background

                                // trigger resize event in setTimeout
                                setTimeout(function () {
                                    window.dispatchEvent(new Event('resize'));
                                }, 100);

                                showNotification('Image saved successfully', '#ffffff', '#000000');

                                winboxPaint.close();
                                done(true);
                            }
                        }).show(viewer.image.src);
                    }
                },
                download: {
                    show: 1,
                    size: 'large',
                    click: function () {
                        download(viewer.image);
                    }
                },
                upload: {
                    show: 1,
                    size: 'large',
                    click: function () {

                        let uriString = getBase64Image(viewer.image);
                        // get base64 part from string
                        let base64 = uriString.split(',')[1];

                        // create html element with text
                        let x = document.createElement("div");
                        // set flex
                        x.style.display = "flex";
                        // set element inner html
                        x.innerHTML = `<i class="gg-spinner"></i> Uploading image... Please wait`;

                        let loadingToast = Toastify({
                            node: x,
                            duration: 999999,
                            newWindow: true,
                            close: false,
                            gravity: 'bottom', // `top` or `bottom`
                            position: 'right', // `left`, `center` or `right`
                            stopOnFocus: true, // Prevents dismissing of toast on hover
                            style: {
                                color: '#ffffff',
                                background: '#000000',
                            },
                            onClick: function () { } // Callback after click
                        }).showToast();

                        // upload image to imgur
                        fetch('https://api.imgur.com/3/image', {
                            method: 'POST',
                            headers: { 'Authorization': `Client-ID ${IMGUR_TOKEN}` },
                            body: base64
                        })
                            .then(res => res.json())
                            .then((res) => {

                                // remove toast
                                let toastifyElems = document.querySelectorAll('.toastify');
                                toastifyElems.forEach(element => {
                                    element.remove()
                                });

                                copyToClipboard(res.data.link);
                                showNotification('Image uploaded successfully ✔️', '#ffffff', '#000000');
                                showNotification(`URL copied to clipboard`, '#ffffff', '#000000');

                            });

                    }
                },
                colorpicker: {
                    show: 1,
                    size: 'large',
                    click: async function () {

                        if (!IS_PICKER_OPEN) {
                            IS_PICKER_OPEN = true;

                            // change cursor to picker
                            viewer.image.style.cursor = 'crosshair';



                            let colorPickerBox = new WinBox("Color Preview", {
                                class: WINBOX_CLASSES,
                                background: "rgba(0,0,0,0.9)",
                                index: 9999,
                                width: '250px',
                                height: '250px',
                                y: "bottom",
                                x: "10px",
                                html: `
                            <div styles="padding: 10px">
                                <div class="color-picker"></div>
                            </div>`,
                                onclose: function () {
                                    IS_PICKER_OPEN = false;
                                    // change cursor back to default
                                    viewer.image.style.cursor = 'default';
                                    viewer.image.click(); // trigger a click to remove the event listener
                                }
                            });


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
                                        input: true,
                                    }
                                }
                            });



                            // auto size window
                            let contentWidth = document.getElementsByClassName('pcr-app')[0].getBoundingClientRect().width;
                            let contentHeight = document.getElementsByClassName('pcr-app')[0].getBoundingClientRect().height;
                            colorPickerBox.resize(contentWidth + 8, contentHeight + 35); // TODO: use better way to get content height and width
                            colorPickerBox.show();

                            // create new canvas
                            let canvas = document.createElement('canvas');
                            canvas.style.display = 'none';

                            let x = ''
                            let y = '';


                            // when image clicked
                            viewer.image.addEventListener('click', function (e) {
                                if (IS_PICKER_OPEN) {
                                    handleImageClickOnPicker(e, viewer, canvas, pickr, x, y);
                                }
                                else {
                                    this.removeEventListener('click', arguments.callee);
                                }

                            }, false);

                            // when mouse move
                            viewer.image.addEventListener('mousemove', function (e) {
                                if (IS_PICKER_OPEN) {
                                    handleMouseMoveOnPicker(e, viewer, canvas, pickr, x, y);
                                }
                                else {
                                    this.removeEventListener('mousemove', arguments.callee);
                                }

                            }, false);
                        }
                        else {
                            return;
                        }
                    }
                },
                details: {
                    show: 1,
                    size: 'large',
                    click: async function () {
                        if (!IS_DETAILS_OPEN) {
                            IS_DETAILS_OPEN = true;
                            new WinBox("Details", {
                                class: [
                                    //"no-scrollbar",
                                    "no-max",
                                    "no-min",
                                    "no-full",
                                    "no-resize",
                                    "no-animation"
                                ],
                                index: 9999,
                                background: "rgba(0,0,0,0.9)",
                                x: "20px",
                                y: "20px",
                                width: '350px',
                                height: '40%',
                                html: `<div id="details-wrapper"></div>`,
                                onclose: function () {
                                    IS_DETAILS_OPEN = false;
                                }
                            });
                        }

                        let img2 = viewer.image

                        const fileImg = await fetch(img2.src).then(r => r.blob());
                        let fileSizeMB = fileImg.size / 1024 / 1024;

                        let imgDetails = {
                            width: img2.naturalWidth,
                            height: img2.naturalHeight,
                            filesize: fileSizeMB.toFixed(2) + " MB",
                        }

                        EXIF.getData(img2, function () {
                            let allMetaData = EXIF.getAllTags(this);
                            // add all metadata to wrapper
                            let wrapper = document.getElementById('details-wrapper');

                            delete allMetaData.ImageWidth;
                            delete allMetaData.ImageHeight;
                            delete allMetaData.thumbnail;


                            allMetaData = { Width: imgDetails.width + "px", Height: imgDetails.height + "px", "File size": imgDetails.filesize, ...allMetaData };



                            var el = document.querySelector('#details-wrapper');
                            el.innerHTML = jsonViewer(allMetaData, true);



                            // convert to string
                            //let metaDataString = JSON.stringify(allMetaData, null, "\t");

                            // add string inside wrapper
                            //wrapper.innerHTML = metaDataString;



                        });

                    }
                },
                theme: {
                    show: 1,
                    size: 'large',
                    click: function () {
                        // blur --> light --> dark
                        changeTheme(imgElement.src);

                    }
                },
                print: {
                    show: 1,
                    size: 'large',
                    click: function () {
                        printImage(viewer.image);
                    }
                },
                ocr: {
                    show: 1,
                    size: 'large',
                    click: function () {


                        let ocrPreviewBox = new WinBox("Image To Text: Select Region", {
                            id: 'ocr-preview',
                            class: WINBOX_CLASSES,
                            modal: false,
                            index: 9999,
                            x: "center",
                            y: "10%",
                            width: viewer.image.width,
                            height: viewer.image.height + 33,
                            background: "rgba(0,0,0,0.9)",
                            html: `<div>
                                <img src="${viewer.image.src}" id="croppr"/>
                            </div>`,
                            onclose: function () {

                                document.querySelector('#ocr-preview').remove();
                                document.querySelector('#ocr-settings').remove();

                            }

                        });


                        ocrPreviewBox.show();

                        let ocrControlBox = new WinBox("Image To Text: Settings", {
                            id: 'ocr-settings',
                            class: WINBOX_CLASSES,
                            modal: false,
                            index: 9999,
                            x: "10px",
                            y: "bottom",
                            top: '10px',
                            bottom: '10px',
                            right: '10px',
                            left: '10px',
                            width: '250px',
                            height: '160px',
                            background: "rgba(0,0,0,0.9)",
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
                                document.querySelector('#ocr-preview').remove();
                                document.querySelector('#ocr-settings').remove();
                                document.querySelector('#ocr-result-box').remove();
                            }
                        });


                        ocrControlBox.show();

                        let croppr = new Croppr('#croppr', {
                            startSize: [50, 20]
                        });


                        Object.keys(ocrLangList).forEach(function (key) {
                            let option = document.createElement('option');
                            option.value = ocrLangList[key];
                            option.text = key;
                            if (key == 'English') {
                                option.selected = true;
                            }
                            document.querySelector('#ocr-languages').appendChild(option);
                        });




                        // when btn-extract-text clicked
                        document.getElementById('btn-extract-text').addEventListener('click', function () {

                            // get selected language
                            let selectedLang = document.querySelector('#ocr-languages').value;


                            const cropRect = croppr.getValue();
                            const canvas = document.createElement("canvas");
                            const context = canvas.getContext("2d");
                            canvas.width = cropRect.width;
                            canvas.height = cropRect.height;
                            context.drawImage(
                                croppr.imageEl,
                                cropRect.x,
                                cropRect.y,
                                cropRect.width,
                                cropRect.height,
                                0,
                                0,
                                canvas.width,
                                canvas.height,
                            );
                            let ImgUrl = canvas.toDataURL();

                            // create html element with text
                            let x = document.createElement("div");
                            // set flex
                            x.style.display = "flex";
                            // set element inner html
                            x.innerHTML = `<i class="gg-spinner"></i> Extracting Text`;


                            let loadingToast = Toastify({
                                node: x,
                                duration: 999999,
                                newWindow: true,
                                close: false,
                                gravity: 'bottom', // `top` or `bottom`
                                position: 'right', // `left`, `center` or `right`
                                stopOnFocus: true, // Prevents dismissing of toast on hover
                                style: {
                                    color: '#ffffff',
                                    background: '#000000',
                                },
                                onClick: function () { } // Callback after click
                            }).showToast();


                            // tesseract to ocr
                            Tesseract.recognize(
                                ImgUrl,
                                selectedLang,
                                { logger: m => console.log(m) }
                            ).then(({ data: { text } }) => {

                                // remove all toasts
                                let toastifyElems = document.querySelectorAll('.toastify');
                                toastifyElems.forEach(element => {
                                    element.remove()
                                });

                                let ocrResElem = document.querySelector('#ocr-textarea');
                                if (ocrResElem) {// if exists, then update
                                    ocrResElem.innerHTML = text;
                                }
                                else { // create new winbox

                                    document.querySelector('#ocr-preview').remove();
                                    document.querySelector('#ocr-settings').remove();


                                    let ocrResultBox = new WinBox("Result", {
                                        id: 'ocr-result-box',
                                        class: WINBOX_CLASSES,
                                        index: 9999,
                                        width: '500px',
                                        height: '320px',
                                        top: '10px',
                                        bottom: '10px',
                                        right: '10px',
                                        left: '10px',
                                        x: "center",
                                        y: "center",

                                        background: "rgba(0,0,0,0.9)",
                                        html: `<div class="ocr-result">
                                        <textarea id="ocr-textarea" rows="10">${text}</textarea>
                                        <button id="btn-copytext" class="ocr-button" role="button">Copy to clipboard</button>
                                    </div>`,
                                    });

                                    ocrResultBox.show();

                                    // when btn-extract-text clicked
                                    document.getElementById('btn-copytext').addEventListener('click', function () {
                                        showNotification('Copied to clipboard', '#ffffff', '#000000');
                                        copyToClipboard(document.querySelector('#ocr-textarea').value);
                                    });







                                }
                            })
                        });





                        // let ocrCropBox = new WinBox("Crop your text", {
                        //     class: [
                        //         "no-max",
                        //         "no-full",
                        //         "no-scrollbar",
                        //     ],
                        //     max: true,
                        //     index: 9999,
                        //     x: "center",
                        //     y: "center",

                        //     background: "rgba(0,0,0,0.9)",
                        //     html: `
                        //     <div>
                        //         <img class="ocr-img" src="${viewer.image.src}" id="croppr"/>
                        //     </div>`
                        // });


                        var cropInstance = new Croppr('#croppr', {});
                        // tesseract list of languages



                        // for each key in object ocr
                        for (const [key, value] of Object.entries(ocrLangList)) {
                            console.log(`${key}: ${value}`);
                        }








                    }
                },
                photopea: {
                    show: 1,
                    size: 'large',
                    click: function () {

                        let uriString = getBase64Image(viewer.image);
                        // get base64 part from string
                        let base64 = uriString.split(',')[1];

                        // create html element with text
                        let x = document.createElement("div");
                        // set flex
                        x.style.display = "flex";
                        // set element inner html
                        x.innerHTML = `<i class="gg-spinner"></i> Opening in Photopea... Please wait`;

                        let loadingToast = Toastify({
                            node: x,
                            duration: 999999,
                            newWindow: true,
                            close: false,
                            gravity: 'bottom', // `top` or `bottom`
                            position: 'right', // `left`, `center` or `right`
                            stopOnFocus: true, // Prevents dismissing of toast on hover
                            style: {
                                color: '#ffffff',
                                background: '#000000',
                            },
                            onClick: function () { } // Callback after click
                        }).showToast();

                        const uri = '{ "files" : [ "' + uriString + '" ] }';
                        const encoded = encodeURI(uri);
                        const urlEncoded = 'https://www.photopea.com/#' + encoded;

                        // remove toast
                        let toastifyElems = document.querySelectorAll('.toastify');
                        toastifyElems.forEach(element => {
                            element.remove()
                        });
                        
                        window.open(urlEncoded, '_blank').focus();

                        showNotification(`Image opened in Photopea`, '#ffffff', '#000000');
                    }
                },
                help: {
                    show: 1,
                    size: 'large',
                    click: function () {

                        if (!IS_HELP_OPEN) {
                            IS_HELP_OPEN = true;

                            new WinBox("Help", {
                                class: WINBOX_CLASSES,
                                index: 9999,
                                x: "center",
                                y: "center",
                                top: '10px',
                                bottom: '10px',
                                right: '10px',
                                left: '10px',
                                width: '720px',
                                height: '423px',
                                background: "rgba(0,0,0,0.9)",
                                index: 9999,
                                url: chrome.runtime.getURL('help/help.html'),
                                onclose: function () {
                                    IS_HELP_OPEN = false;
                                }
                            })


                            new WinBox("Shortcuts", {
                                class: WINBOX_CLASSES,
                                index: 9999,
                                x: "right",
                                y: "center",
                                top: '10px',
                                bottom: '10px',
                                right: '10px',
                                left: '10px',
                                width: '250px',
                                height: '450px',
                                background: "rgba(0,0,0,0.9)",
                                index: 9999,
                                url: chrome.runtime.getURL('help/shortcuts.html'),
                                onclose: function () {
                                    IS_HELP_OPEN = false;
                                }
                            });
                        }

                    }
                },
                exit: {
                    show: 1,
                    size: 'large',
                    click: function () {
                        let url = window.location.href;
                        viewer.destroy();
                        document.querySelector('.blurry-bg').remove();
                        document.querySelector('img').style.display = 'block';
                        document.querySelectorAll('.winbox').forEach(function (el) {
                            el.remove();
                        });
                        // remove all style tags
                        let styleTags = document.querySelectorAll('style');
                        styleTags.forEach(function (el) {
                            el.remove();
                        });
                        document.querySelector('img').src = url;
                    }

                },
                about: {
                    show: 1,
                    size: 'large',
                    click: function () {
                        new WinBox("About", {
                            class: WINBOX_CLASSES,
                            index: 9999,
                            x: "center",
                            y: "center",
                            width: '550px',
                            height: '450px',
                            background: "rgba(0,0,0,0.9)",
                            index: 9999,
                            url: chrome.runtime.getURL('help/about.html'),
                        });
                    }
                },


            },

        });


        // inject css
        injectCSS(`
            .blurry-bg {
                background-image: url("${imgElement.src}");
                filter: blur(15px);
                -webkit-filter: blur(15px);
                height: 100%;
                background-position: center;
                background-repeat: no-repeat;
                background-size: cover;
                width: 100vw;
                height: 100vh;
                transform: scale(1.3); 
            }
            /* Make blur darker */
            .blurry-bg:before {
                content: '';
                background-color: #000;
                opacity: 0.5;
                width: 100%;
                height: 100%;
                z-index: 1;
                position: absolute;
                top: 0;
                left: 0;
            }
            img{
                display: none;
            }
            `);

        // show the viewer
        viewer.show();
        setTippyText(tippyData);

    }
    else {
        // No img element, then... maybe it's a svg ?
        let svgElement = document.getElementsByTagName('svg')[0]; // get svg element
        if (svgElement) {
            let base64 = svgToBase64(svgElement);
            // redirect to svg viewer

        }
        else {
            // I don't know what it is, but I don't care about it
        }
    }
}

/**
 * Helper function - converts an svg element to a base64 string
 * @param {svgElement} svgElement the svg element to convert
 * @returns 
 */
function svgToBase64(svgElement) {
    let svgString = new XMLSerializer().serializeToString(svgElement);
    let decoded = unescape(encodeURIComponent(svgString));
    let base64 = btoa(decoded)
    let imgSource = `data:image/svg+xml;base64,${base64}`;
    return imgSource;
}

/**
 * Injects css into the page
 * @param {string} css string to inject
 * @returns 
 */
function injectCSS(css) {
    let head = document.getElementsByTagName('head')[0];
    if (!head) {
        return;
    }
    let style = document.createElement('style');
    style.innerHTML = css;
    head.appendChild(style);
}

/**
 * tippy.js text - add tooltips to viewer's toolbar
 * @param {*} arrBtns array Of Buttons
 */
function setTippyText(arrBtns) {

    window.tippyInstances = [];


    arrBtns.forEach(function (item) {
        let instances = tippy(`#viewer0 > div.viewer-footer > div.viewer-toolbar > ul > li.viewer-${item.type}.viewer-large`, {
            content: item.text,
            inertia: true,
            animation: 'scale',
            theme: 'dark',
        })
        window.tippyInstances = tippyInstances.concat(instances);
    });

}

/**
 * Download image
 * @param {HTMLElement} image Viewer Image
 */
function download(image) {
    const a = document.createElement('a');
    a.href = image.src;
    a.download = image.alt;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * 
 * @param {viewer} viewer 
 * @param {string} url 
 * @param {*} width 
 * @param {*} height 
 */
function crop(viewer, url, width, height) {

    // make viewer smaller 
    viewer.zoom(-0.5);

    // create new winbox
    let winbox = new WinBox("Crop Image", {
        class: WINBOX_CLASSES,
        width: width,
        height: height + 33,
        x: "center",
        y: "center",
        index: 9999,
        background: "rgba(0,0,0,0.9)",
        html: `
        <div>
            <img id="crop-img" src="${url}">
        </div>
        `,
        onclose: function () {
            // reset viewer zoom
            viewer.zoom(0.5);
            IS_CROP_OPEN = false;
        }
    });

    winbox.show();

    let croppr = new Croppr('#crop-img', {
        startSize: ["80", "80"]
    });

    setTimeout(function () {
        // inject inside div
        let selectionDiv = document.querySelector(".croppr-region")
        let cropDiv = document.createElement('div');
        cropDiv.innerHTML = `<div class="center-crop-btn"><i class="confirm-icon"></i></div>`;
        selectionDiv.appendChild(cropDiv);

        cropDiv.addEventListener('click', function () {
            const cropRect = croppr.getValue();
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = cropRect.width;
            canvas.height = cropRect.height;
            context.drawImage(
                croppr.imageEl,
                cropRect.x,
                cropRect.y,
                cropRect.width,
                cropRect.height,
                0,
                0,
                canvas.width,
                canvas.height,
            );
            let ImgUrl = canvas.toDataURL();

            viewer.image.src = ImgUrl;

            switch (BACKGROUND_TYPE) {
                case 'blurred':
                    injectCSS(`
                    .blurry-bg {
                        background-image: url("${ImgUrl}");
                    }`);
                    break;
                case 'light':
                    break;
                case 'dark':
                    break;
                default:
                    break;
            }

            setTimeout(function () {
                viewer.zoom(0.5);
                window.dispatchEvent(new Event('resize'));
            }, 100);

            //showNotification("Image cropped successfully", '#ffffff', '#000000')
            IS_CROP_OPEN = false;
            winbox.close();

        });
    }, 100);






    // // hide tippy instances
    // tippyInstances.forEach(instance => {
    //     instance.destroy();
    // });
    // tippyInstances.length = 0; // clear it

    // // hide div with viewer-toolbar class name
    // document.getElementsByClassName('viewer-toolbar')[0].style.display = 'none';
    // // create floating buttons for cropper
    // let cropperButtons = document.createElement('div');
    // cropperButtons.classList.add('cropper-buttons');
    // cropperButtons.style.zIndex = '9999';
    // cropperButtons.innerHTML = `
    //     <button class="crop-btn" role="button" id="crop-btn"><i class="gg-crop"></i> Crop</button>
    //     <button class="cancel-btn" role="button" id="cancel-btn"><i class="gg-cancel"></i> Cancel</button>
    // `;
    // // append to body
    // document.body.appendChild(cropperButtons);

    // // get viewer-canvas img element
    // let viewerCanvas = document.getElementsByClassName('viewer-canvas')[0]
    // let imgElement = viewerCanvas.getElementsByTagName('img')[0]
    // //console.log(imgElement.src)
    // let cropper = new Cropper(imgElement, {
    //     viewMode: 2, // can't go outside the canvas,
    // });


    // // when crop btn clicked
    // document.getElementById('crop-btn').addEventListener('click', function () {

    //     showNotification('Image cropped successfully', '#ffffff', '#000000');

    //     cropper.getCroppedCanvas().toBlob(function (blob) {
    //         // create base64 image
    //         let reader = new FileReader();
    //         reader.readAsDataURL(blob);
    //         reader.onloadend = function (base64) {
    //             // replace image with cropped image

    //             // get list of img elements
    //             let imgElements = document.getElementsByTagName('img');
    //             // loop through all img elements
    //             for (let i = 0; i < imgElements.length; i++) {
    //                 // replace image with cropped image
    //                 imgElements[i].src = base64.target.result;
    //             }


    //             // update blurry background
    //             //document.getElementsByClassName('blurry-bg')[0].style.backgroundImage = `url("${base64.target.result}")`;
    //             // update cropper-wrap-box background
    //             //document.getElementsByClassName('cropper-wrap-box')[0].style.backgroundImage = `url("${base64.target.result}")`;


    //             switch (BACKGROUND_TYPE) {
    //                 case 'blurred':

    //                     injectCSS(`
    //                         .blurry-bg {
    //                             background-image: url("${base64.target.result}");
    //                         }
    //                     `);
    //                     //document.getElementsByClassName('blurry-bg')[0].style.backgroundImage = `url("${base64.target.result}")`;
    //                     //document.getElementsByClassName('cropper-wrap-box')[0].style.backgroundImage = `url("${base64.target.result}")`;
    //                     break;
    //                 case 'light':
    //                     //document.getElementsByClassName('cropper-wrap-box')[0].style.backgroundImage = `url("${base64.target.result}")`;
    //                     break;
    //                 case 'dark':
    //                     //document.getElementsByClassName('cropper-wrap-box')[0].style.backgroundImage = `url("${base64.target.result}")`;
    //                     break;
    //                 default:
    //                     break;
    //             }



    //             // trigger resize event in setTimeout
    //             setTimeout(function () {
    //                 window.dispatchEvent(new Event('resize'));
    //             }, 100);

    //             // reset imgElement style
    //             imgElement.style.width = 'auto';
    //             imgElement.style.height = 'auto';

    //             // remove cropper buttons
    //             cropperButtons.remove();
    //             // delete cropper
    //             cropper.destroy();
    //             // show div with viewer-toolbar class name
    //             document.getElementsByClassName('viewer-toolbar')[0].style.display = 'block';
    //             // restore tippy
    //             setTippyText(tippyData);

    //         }
    //     });
    // });

    // // when cancel btn clicked
    // document.getElementById('cancel-btn').addEventListener('click', function () {

    //     // trigger resize event in setTimeout
    //     setTimeout(function () {
    //         window.dispatchEvent(new Event('resize'));
    //     }, 100);

    //     // reset imgElement style
    //     imgElement.style.width = 'auto';
    //     imgElement.style.height = 'auto';

    //     // remove cropper buttons
    //     cropperButtons.remove();
    //     // delete cropper
    //     cropper.destroy();
    //     // show div with viewer-toolbar class name
    //     document.getElementsByClassName('viewer-toolbar')[0].style.display = 'block';
    //     // restore tippy
    //     setTippyText(tippyData);
    // })


}



// canvas function
function useCanvas(el, image, callback) {
    el.width = image.width; // img width
    el.height = image.height; // img height
    // draw image in canvas tag
    el.getContext('2d').drawImage(image, 0, 0, image.width, image.height);
    return callback();
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function findPos(obj) {
    var curleft = 0, curtop = 0;
    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
        return { x: curleft, y: curtop };
    }
    return undefined;
}

function resetColorPicker(winboxPicker, viewer) {
    //console.log(e);
}

const handleImageClickOnPicker = (e, viewer, canvas, pickr, x, y) => {

    if (e.offsetX) {
        x = e.offsetX;
        y = e.offsetY;
    }

    useCanvas(canvas, viewer.image, () => {
        // get image data
        let p = canvas.getContext('2d').getImageData(x, y, 1, 1).data;
        // show info
        pickr.setColor(rgbToHex(p[0], p[1], p[2]));

        copyToClipboard(rgbToHex(p[0], p[1], p[2]));

        showNotification(`${rgbToHex(p[0], p[1], p[2]).toUpperCase()} copied to clipboard`, getColorByBgColor(rgbToHex(p[0], p[1], p[2])), rgbToHex(p[0], p[1], p[2]));



    });







}

const handleMouseMoveOnPicker = (e, viewer, canvas, pickr, x, y) => {

    if (e.offsetX) {
        x = e.offsetX;
        y = e.offsetY;
    }
    useCanvas(canvas, viewer.image, function () {
        // get image data
        var p = canvas.getContext('2d').getImageData(x, y, 1, 1).data;
        pickr.setColor(rgbToHex(p[0], p[1], p[2]));
    });


}

/**
 * Get color (black/white) depending on bgColor so it would be clearly seen.
 * @param {string} bgColor
 * @returns {string}
 */
function getColorByBgColor(bgColor) {
    if (!bgColor) { return ''; }
    return (parseInt(bgColor.replace('#', ''), 16) > 0xffffff / 2) ? '#000' : '#fff';
}

/**
 * Copy string to clipboard
 * @param {string} str - string to copy
 */
function copyToClipboard(textToCopy) {
    // navigator clipboard api needs a secure context (https)
    if (navigator.clipboard && window.isSecureContext) {
        // navigator clipboard api method'
        return navigator.clipboard.writeText(textToCopy);
    } else {
        // text area method
        let textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        // make the textarea out of viewport
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((res, rej) => {
            // here the magic happens
            document.execCommand('copy') ? res() : rej();
            textArea.remove();
        });
    }
};


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
    let canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    let dataURL = canvas.toDataURL();
    return dataURL;
}


function changeTheme(imgsrc) {


    let lightTheme = `background-image: url("data:image/svg+xml,%0A%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-sun'%3E%3Ccircle cx='12' cy='12' r='5'%3E%3C/circle%3E%3Cline x1='12' y1='1' x2='12' y2='3'%3E%3C/line%3E%3Cline x1='12' y1='21' x2='12' y2='23'%3E%3C/line%3E%3Cline x1='4.22' y1='4.22' x2='5.64' y2='5.64'%3E%3C/line%3E%3Cline x1='18.36' y1='18.36' x2='19.78' y2='19.78'%3E%3C/line%3E%3Cline x1='1' y1='12' x2='3' y2='12'%3E%3C/line%3E%3Cline x1='21' y1='12' x2='23' y2='12'%3E%3C/line%3E%3Cline x1='4.22' y1='19.78' x2='5.64' y2='18.36'%3E%3C/line%3E%3Cline x1='18.36' y1='5.64' x2='19.78' y2='4.22'%3E%3C/line%3E%3C/svg%3E");`
    let darkTheme = `background-image: url("data:image/svg+xml,%0A%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-moon'%3E%3Cpath d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'%3E%3C/path%3E%3C/svg%3E");`
    let blurTheme = `background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-droplet'%3E%3Cpath d='M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z'%3E%3C/path%3E%3C/svg%3E"); `;

    switch (BACKGROUND_TYPE) {
        case 'blurred':
            showNotification('☀️ Light Background', '#000000', '#ffffff');
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
                
                `);
            BACKGROUND_TYPE = 'light';
            break;
        case 'light':
            showNotification('🌑 Dark Background', '#ffffff', '#000000');
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
            }
            .blurry-bg:before {
                opacity: 0;
            }
            `);
            BACKGROUND_TYPE = 'dark';
            break;
        case 'dark':
            // change to blurred
            showNotification('Blurred Background', '#ffffff', '#404040');
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
            }
            .blurry-bg:before {
                opacity: 0.5;
            }`);
            BACKGROUND_TYPE = 'blurred';
            break;
    }
}


function showNotification(text, textColor, bgColor, seconds = 5000, gravity = 'bottom', position = 'right') {
    Toastify({
        text: `${text}`,
        duration: seconds,
        newWindow: true,
        close: false,
        gravity: gravity, // `top` or `bottom`
        position: position, // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            color: textColor,
            background: bgColor,
        },
        onClick: function () { } // Callback after click
    }).showToast();
}


function jsonViewer(json, collapsible = false) {
    var TEMPLATES = {
        item: '<div class="json__item"><div class="json__key">%KEY%</div><div class="json__value json__value--%TYPE%">%VALUE%</div></div>',
        itemCollapsible: '<label class="json__item json__item--collapsible"><input type="checkbox" class="json__toggle"/><div class="json__key">%KEY%</div><div class="json__value json__value--type-%TYPE%">%VALUE%</div>%CHILDREN%</label>',
        itemCollapsibleOpen: '<label class="json__item json__item--collapsible"><input type="checkbox" checked class="json__toggle"/><div class="json__key">%KEY%</div><div class="json__value json__value--type-%TYPE%">%VALUE%</div>%CHILDREN%</label>'
    };

    function createItem(key, value, type) {
        var element = TEMPLATES.item.replace('%KEY%', key);

        if (type == 'string') {
            element = element.replace('%VALUE%', '"' + value + '"');
        } else {
            element = element.replace('%VALUE%', value);
        }

        element = element.replace('%TYPE%', type);

        return element;
    }

    function createCollapsibleItem(key, value, type, children) {
        var tpl = 'itemCollapsible';

        if (collapsible) {
            tpl = 'itemCollapsibleOpen';
        }

        var element = TEMPLATES[tpl].replace('%KEY%', key);

        element = element.replace('%VALUE%', type);
        element = element.replace('%TYPE%', type);
        element = element.replace('%CHILDREN%', children);

        return element;
    }

    function handleChildren(key, value, type) {
        var html = '';

        for (var item in value) {
            var _key = item,
                _val = value[item];

            html += handleItem(_key, _val);
        }

        return createCollapsibleItem(key, value, type, html);
    }

    function handleItem(key, value) {
        var type = typeof value;

        if (typeof value === 'object') {
            return handleChildren(key, value, type);
        }

        return createItem(key, value, type);
    }

    function parseObject(obj) {
        _result = '<div class="json">';

        for (var item in obj) {
            var key = item,
                value = obj[item];

            _result += handleItem(key, value);
        }

        _result += '</div>';

        return _result;
    }

    return parseObject(json);
};


