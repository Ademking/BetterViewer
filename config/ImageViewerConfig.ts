export const createViewerConfig = ({
  paintClickHandler,
  cropperClickHandler,
  resetImageHandler,
  colorPickerClickHandler,
  downloadImageClickHandler,
  qrCodeClickHandler,
  photopeaClickHandler,
  tineyeClickHandler,
  aboutClickHandler,
  detailsClickHandler,
  //ocrClickHandler,
}: {
  paintClickHandler: () => void;
  cropperClickHandler: () => void;
  resetImageHandler: (v) => void;
  colorPickerClickHandler: () => void;
  downloadImageClickHandler: () => void;
  qrCodeClickHandler: () => void;
  photopeaClickHandler: () => void;
  tineyeClickHandler: () => void;
  aboutClickHandler: () => void;
  detailsClickHandler: () => void;
  //ocrClickHandler: () => void;
}): any => ({
  toolbarPosition: "bottom",
  transition: true,
  inline: true,
  navbar: false,
  fullscreen: false,
  interval: 0,
  tooltip: true,
  zoomRatio: 0.5,
  title: false,
  keyboard: false,
  backdrop: true,
  toolbar: {
    zoomIn: {
      show: 1,
      size: "large",
    },
    zoomOut: {
      show: 1,
      size: "large",
    },
    oneToOne: {
      show: 1,
      size: "large",
    },
    reset: {
      show: 1,
      size: "large",
      click: resetImageHandler,
    },
    prev: false,
    play: {
      show: 1,
      size: "large",
    },
    next: false,
    rotateLeft: {
      show: 1,
      size: "large",
    },
    rotateRight: {
      show: 1,
      size: "large",
    },
    flipHorizontal: {
      show: 1,
      size: "large",
    },
    flipVertical: {
      show: 1,
      size: "large",
    },
    crop: {
      show: 1,
      size: "large",
      click: cropperClickHandler,
    },
    paint: {
      show: 1,
      size: "large",
      click: paintClickHandler,
    },
    colorpicker: {
      show: 1,
      size: "large",
      click: colorPickerClickHandler,
    },
    download: {
      show: 1,
      size: "large",
      click: downloadImageClickHandler,
    },
    qr: {
      show: 1,
      size: "large",
      click: qrCodeClickHandler,
    },
    photopea: {
      show: 1,
      size: "large",
      click: photopeaClickHandler,
    },
    tineye: {
      show: 1,
      size: "large",
      click: tineyeClickHandler,
    },
    details: {
      show: 1,
      size: "large",
      click: detailsClickHandler,
    },
    about: {
      show: 1,
      size: "large",
      click: aboutClickHandler,
    },
    // ocr: {
    //   show: 1,
    //   size: "large",
    //   click: ocrClickHandler,
    // },
  },
});

export const tipppyOptions = [
  {
    selector: ".viewer-zoom-in",
    text: "Zoom In",
  },
  {
    selector: ".viewer-zoom-out",
    text: "Zoom Out",
  },
  {
    selector: ".viewer-one-to-one",
    text: "1:1",
  },
  {
    selector: ".viewer-reset",
    text: "Reset",
  },
  {
    selector: ".viewer-fit-to-screen",
    text: "Fit to Screen",
  },
  {
    selector: ".viewer-rotate-left",
    text: "Rotate Left",
  },
  {
    selector: ".viewer-rotate-right",
    text: "Rotate Right",
  },
  {
    selector: ".viewer-flip-horizontal",
    text: "Flip Horizontal",
  },
  {
    selector: ".viewer-flip-vertical",
    text: "Flip Vertical",
  },
  {
    selector: ".viewer-crop",
    text: "Crop Image",
  },
  {
    selector: ".viewer-download",
    text: "Download",
  },
  {
    selector: ".viewer-play",
    text: "Fullscreen",
  },
  {
    selector: ".viewer-details",
    text: "Image Details",
  },
  {
    selector: ".viewer-colorpicker",
    text: "Color Picker",
  },
  {
    selector: ".viewer-paint",
    text: "Photo Editor",
  },
  {
    selector: ".viewer-print",
    text: "Print image",
  },
  {
    selector: ".viewer-help",
    text: "Help",
  },
  {
    selector: ".viewer-theme",
    text: "Toggle Theme",
  },
  {
    selector: ".viewer-exit",
    text: "Turn Off",
  },
  {
    selector: ".viewer-upload",
    text: "Upload Image",
  },
  {
    selector: ".viewer-ocr",
    text: "Extract Text",
  },
  {
    selector: ".viewer-photopea",
    text: "Edit in Photopea",
  },
  {
    selector: ".viewer-tineye",
    text: "Reverse Image Search",
  },
  {
    selector: ".viewer-about",
    text: "About BetterViewer",
  },
  {
    selector: ".viewer-qr",
    text: "Scan QR Code from Image",
  },
  {
    selector: ".viewer-settings",
    text: "Settings",
  },
];
