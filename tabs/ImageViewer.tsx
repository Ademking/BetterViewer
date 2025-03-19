import { useEffect, useRef, useState } from "react";
import { useStorage } from "@plasmohq/storage/hook";
import Viewer from "viewerjs";
import WinBox from "react-winbox";
import { tipppyOptions, createViewerConfig } from "../config/ImageViewerConfig";
import tippy from "tippy.js";
import ImageEditor from "~components/ImageEditor";
import { useWindowSize } from "@uidotdev/usehooks";
import ImageCropper from "~components/ImageCropper";
import { Storage } from "@plasmohq/storage";
import { toast, Toaster } from "sonner";
import "../styles.css";
import "tippy.js/dist/tippy.css";
import "viewerjs/dist/viewer.min.css";
import "winbox/dist/css/winbox.min.css";
import ColorPicker from "~components/ColorPicker";

import { imageDownloader } from "~utils/downloadImage";
import { decodeQRCode } from "~utils/qrDecoder";
import ErrorIcon from "~components/ErrorIcon";
import ClipboardIcon from "~components/ClipboardIcon";
import { uploadToImgbb } from "~utils/uploadToImgbb";
import { imageToBase64 } from "~utils/imageConverter";
import About from "~components/About";
import EXIF from "exif-js";
import JsonViewer from "~components/JsonViewer";
import Help from "~components/Help";
import TldrawWrapper from "~components/TldrawWrapper";
import initHotKeys from "~config/HotKeys";
import { waitForElement } from "~utils/waitForElement";
import useImageViewerStore from "~stores/useImageViewerStore";
import { useHotkeys } from "react-hotkeys-hook";

function ImageViewer() {
  const [imageUrl] = useStorage({
    key: "imageUrl",
    instance: new Storage({
      area: "local",
    }),
  });
  const {
    persistedImageUrl,
    isEditorOpen,
    isCropperOpen,
    isColorPickerOpen,
    isAboutOpen,
    isTldrawOpen,
    isHotKeysEnabled,
    setPersistedImageUrl,
    setIsEditorOpen,
    setIsCropperOpen,
    setIsColorPickerOpen,
    setIsAboutOpen,
    setIsTldrawOpen,
    setIsHotKeysEnabled,
  } = useImageViewerStore();
  const size = useWindowSize();
  const imageRef = useRef(null);
  const viewerRef = useRef(null);
  const winBoxCropperRef = useRef(null);
  const winBoxEditorRef = useRef(null);
  const winBoxColorPickerRef = useRef(null);
  const winBoxAboutRef = useRef(null);
  const winBoxAnnotationRef = useRef(null);
  const [winboxCropperWidth, setWinboxCropperWidth] = useState(0);
  const [winboxCropperHeight, setWinboxCropperHeight] = useState(0);

  const initImageViewer = (
    imageUrl: string,
    imageRef: React.RefObject<HTMLImageElement>
  ) => {
    const viewerOptions = createViewerConfig({
      onViewerReady: () => {
        // TODO: add event listeners for the viewer
      },
      paintClickHandler: () => {
        setIsEditorOpen(true);
      },
      cropperClickHandler: () => {
        setIsCropperOpen(true);
      },
      resetImageHandler: (v) => {
        setPersistedImageUrl(imageUrl);
        if (viewerRef.current) {
          viewerRef.current.update();
        }
      },
      colorPickerClickHandler: () => {
        setIsColorPickerOpen(true);
      },
      downloadImageClickHandler: () => {
        imageDownloader(persistedImageUrl);
      },
      qrCodeClickHandler: async () => {
        scanQRfromImage();
      },
      photopeaClickHandler: async () => {
        await openPhotoPea(imageRef);
      },
      tineyeClickHandler: async () => {
        await openTinEye(imageRef);
      },
      detailsClickHandler: () => {
        handleImageExif(imageUrl);
      },
      aboutClickHandler: () => {
        setIsAboutOpen(true);
      },
      annotateClickHandler: () => {
        setIsTldrawOpen(true);
        setIsHotKeysEnabled(false); // Disable hotkeys when Tldraw is open to prevent conflicts with Tldraw hotkeys
      },
      moreClickHandler: () => {
        // TODO: create a dropdown menu for more options
      },
    });
    const viewerInstance = new Viewer(imageRef.current, viewerOptions);
    viewerRef.current = viewerInstance;
  };

  // Initialize the image viewer
  useEffect(() => {
    if (imageUrl && imageRef.current) {
      initImageViewer(imageUrl, imageRef);
      if (persistedImageUrl !== imageUrl && persistedImageUrl == null) {
        setPersistedImageUrl(imageUrl);
      }
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, [imageUrl, persistedImageUrl, setPersistedImageUrl]);

  // Initialize tippy tooltips
  useEffect(() => {
    waitForElement(".viewer-toolbar").then(() => {
      tipppyOptions.forEach((tippyOption) => {
        tippy(tippyOption.selector, {
          content: tippyOption.text,
          allowHTML: true,
        });
      });
    });
  }, [persistedImageUrl]);

  // if color picker is open, add colorpicker-cursor class in the viewer, else remove it
  useEffect(() => {
    if (viewerRef.current && viewerRef.current.image) {
      if (isColorPickerOpen) {
        viewerRef.current.image.classList.add("cursor-crosshair");
      } else {
        viewerRef.current.image.classList.remove("cursor-crosshair");
      }
    }
  }, [isColorPickerOpen]);

  // Hotkeys configuration
  const hotkeys = initHotKeys({
    viewerRef,
    setIsCropperOpen,
    setIsEditorOpen,
    setIsColorPickerOpen,
    persistedImageUrl,
    scanQRfromImage,
    handleImageExif,
  });

  // Add hotkeys to the viewer
  hotkeys.forEach(({ keys, action }) => {
    useHotkeys(keys, action, {
      enabled: isHotKeysEnabled,
      preventDefault: true,
    });
  });

  return (
    <div className="bg-[#0e0e0e] h-screen w-screen flex items-center justify-center">
      <Toaster
        toastOptions={{
          style: {
            background: "#0e0e0e",
          },
        }}
        theme="dark"
        closeButton
      />

      {isColorPickerOpen && viewerRef.current && viewerRef.current.image && (
        <WinBox
          ref={winBoxColorPickerRef}
          width={460}
          height={240}
          index={9999}
          x={20}
          y={"bottom"}
          bottom={20}
          background="rgba(0,0,0,0.9)"
          className="overflow-hidden bg-[#0e0e0e]"
          title="Color Picker"
          onClose={() => {
            setIsColorPickerOpen(false);
          }}
          onHide={() => {
            setIsColorPickerOpen(false);
          }}
          noMax
          noMin
          noResize
          noFull
        >
          <ColorPicker
            zoomScale={viewerRef.current.imageData.ratio}
            imageElem={viewerRef.current.image}
            isFlipped={viewerRef.current.imageData.rotate % 180 !== 0}
          />
        </WinBox>
      )}

      {isTldrawOpen && (
        <WinBox
          ref={winBoxAnnotationRef}
          width={size.width - 100}
          height={size.height - 100}
          x="center"
          y={30}
          background="rgba(0,0,0,0.9)"
          className="overflow-hidden bg-[#0e0e0e]"
          title="Photo Editor"
          onClose={() => {
            setIsTldrawOpen(false);
            setIsHotKeysEnabled(true); // Enable hotkeys when Tldraw is closed
          }}
          onHide={() => {
            setIsTldrawOpen(false);
            setIsHotKeysEnabled(true); // Enable hotkeys when Tldraw is closed
          }}
        >
          <TldrawWrapper
            imageRef={viewerRef.current.image}
            onSave={(img) => {
              setPersistedImageUrl(img);
              setIsTldrawOpen(false);
              setIsHotKeysEnabled(true); // Enable hotkeys when Tldraw is closed
            }}
          />
        </WinBox>
      )}

      {isEditorOpen && (
        <WinBox
          ref={winBoxEditorRef}
          width={size.width - 100}
          height={size.height - 100}
          x="center"
          y={30}
          background="rgba(0,0,0,0.9)"
          className="overflow-hidden bg-[#0e0e0e]"
          title="Photo Editor"
          onClose={() => {
            setIsEditorOpen(false);
          }}
          onHide={() => {
            setIsEditorOpen(false);
          }}
        >
          <ImageEditor
            imageUrl={persistedImageUrl}
            onImageSave={(img) => {
              // FIXME: Close the color picker window if it is open.
              // There is a bug where the color picker window causes issues when the image is saved
              // and the color picker window is still open.
              setIsColorPickerOpen(false);
              setPersistedImageUrl(img);
              setIsEditorOpen(false);
              toast.success("Image saved successfully");
            }}
          />
        </WinBox>
      )}

      {isCropperOpen && (
        <WinBox
          ref={winBoxCropperRef}
          width={size.width - 200}
          height={size.height - 200}
          y={50}
          x="center"
          background="rgba(0,0,0,0.9)"
          className="overflow-hidden bg-[#0e0e0e]"
          title="Crop Image"
          onClose={() => {
            setIsCropperOpen(false);
          }}
          onHide={() => {
            setIsCropperOpen(false);
          }}
          onResize={(w, h) => {
            setWinboxCropperWidth(w);
            setWinboxCropperHeight(h);
          }}
        >
          <div className="h-full w-full flex items-center justify-center">
            <ImageCropper
              width={winboxCropperWidth}
              height={winboxCropperHeight}
              imageSrc={persistedImageUrl}
              updateCroppedImage={(croppedImage) => {
                // FIXME: Close the color picker window if it is open.
                // There is a bug where the color picker window causes issues when the image is saved
                // and the color picker window is still open.
                setIsColorPickerOpen(false);
                setPersistedImageUrl(croppedImage);
                setIsCropperOpen(false);
              }}
            />
          </div>
        </WinBox>
      )}

      {isAboutOpen && (
        <>
          <WinBox
            ref={winBoxAboutRef}
            width={Math.min(size.width - 200, 1200)}
            height={Math.min(size.height - 200, 700)}
            y="center"
            x="center"
            background="rgba(0,0,0,0.9)"
            className="overflow-hidden bg-[#0e0e0e]"
            title="About"
            onClose={() => {
              setIsAboutOpen(false);
            }}
            onHide={() => {
              setIsAboutOpen(false);
            }}
          >
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="col-span-1">
                <About />
              </div>
              <div className="col-span-1 overflow-y-auto h-full">
                <Help />
              </div>
            </div>
          </WinBox>
        </>
      )}

      <img
        ref={(ref) => {
          imageRef.current = ref;
        }}
        className="h-full w-full object-cover blur-lg"
        src={persistedImageUrl}
        alt="image1"
        onLoad={() => {
          if (viewerRef.current) {
            viewerRef.current.update();
          }
        }}
      />
    </div>
  );

  function handleImageExif(imageUrl: string) {
    const img = new window.Image();
    img.src = imageUrl;
    img.crossOrigin = "Anonymous";
    const loadingToast = toast.loading("Loading EXIF data...");

    img.onload = function () {
      EXIF.getData(img as any, function (this: any) {
        let allMetaData = EXIF.getAllTags(this);
        // add image width and height to metadata
        allMetaData = {
          ...allMetaData,
          Width: this.width,
          Height: this.height,
        };

        toast.dismiss(loadingToast);
        toast(<JsonViewer data={allMetaData} />);
      });
    };
    img.onerror = function () {
      toast.dismiss(loadingToast);
      toast.error("Failed to load EXIF data");
    };
  }

  async function openTinEye(imageRef) {
    const imageBase64 = await imageToBase64(imageRef);
    const loadingUploadToast = toast.loading("Uploading image to Tineye...");
    uploadToImgbb(imageBase64, 60).then((result) => {
      if (result.data.url) {
        const uploadedImageUrl = result.data.image.url;
        const encodedUrl = encodeURIComponent(uploadedImageUrl);
        const tineyeUrl = `https://www.tineye.com/search/?url=${encodedUrl}`;
        window.open(tineyeUrl, "_blank");
        toast.dismiss(loadingUploadToast);
      } else {
        toast.error("Failed to upload image to Tineye");
      }
    });
  }

  async function openPhotoPea(imageRef) {
    const imageBase64 = await imageToBase64(imageRef);
    const loadingUploadToast = toast.loading("Uploading image to Photopea...");
    uploadToImgbb(imageBase64, 60).then((result) => {
      if (result.data.url) {
        const uri = '{ "files" : [ "' + result.data.image.url + '" ] }';
        const encoded = encodeURI(uri);
        const photopeaUrl = `https://www.photopea.com/#${encoded}`;
        window.open(photopeaUrl, "_blank");
        toast.dismiss(loadingUploadToast);
      } else {
        toast.error("Failed to upload image to photopea");
      }
    });
  }

  function scanQRfromImage() {
    decodeQRCode(persistedImageUrl)
      .then((qrCodeValue) => {
        if (!qrCodeValue) {
          toast.message("No QR code found", {
            description: "Please try with another image",
            icon: <ErrorIcon />,
          });
          return;
        }
        toast(<div className="whitespace-pre-wrap">{qrCodeValue}</div>, {
          action: {
            label: (
              <>
                <span className="inline-flex items-center space-x-1">
                  <ClipboardIcon className="w-3 h-3 text-black fill-current" />
                  <span className="ml-1">Copy</span>
                </span>
              </>
            ),
            onClick: () => {
              navigator.clipboard.writeText(qrCodeValue);
              toast.success("Copied to clipboard");
            },
          },
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }
}

export default ImageViewer;
