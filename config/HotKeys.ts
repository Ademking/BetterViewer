import { useHotkeys } from "react-hotkeys-hook";
import { imageDownloader } from "~utils/downloadImage";

export default function initHotKeys(
  viewerRef,
  setIsCropperOpen,
  setIsEditorOpen,
  setIsColorPickerOpen,
  persistedImageUrl,
  scanQRfromImage,
  handleImageExif
) {
  const hotkeys = [
    {
      keys: "mod+add, add",
      action: (e) => {
        e.preventDefault();
        if (viewerRef.current) {
          viewerRef.current.zoom(0.2);
        }
      },
    },
    {
      keys: "mod+subtract, subtract",
      action: (e) => {
        e.preventDefault();
        if (viewerRef.current) {
          viewerRef.current.zoom(-0.2);
        }
      },
    },
    {
      keys: "0, mod+0",
      action: (e) => {
        e.preventDefault();
        if (viewerRef.current) {
          viewerRef.current.zoomTo(1);
        }
      },
    },
    {
      keys: "shift+left",
      action: (e) => {
        e.preventDefault();
        if (viewerRef.current) {
          viewerRef.current.rotate(-90);
        }
      },
    },
    {
      keys: "shift+right",
      action: (e) => {
        e.preventDefault();
        if (viewerRef.current) {
          viewerRef.current.rotate(90);
        }
      },
    },
    {
      keys: "mod+down, mod+up",
      action: (e) => {
        e.preventDefault();
        if (viewerRef.current) {
          viewerRef.current.scaleY(
            viewerRef.current.imageData.scaleY === 1 ? -1 : 1
          );
        }
      },
    },
    {
      keys: "mod+right, mod+left",
      action: (e) => {
        e.preventDefault();
        if (viewerRef.current) {
          viewerRef.current.scaleX(
            viewerRef.current.imageData.scaleX === 1 ? -1 : 1
          );
        }
      },
    },
    {
      keys: "mod+x",
      action: (e) => {
        e.preventDefault();
        setIsCropperOpen(true);
      },
    },
    {
      keys: "mod+e",
      action: (e) => {
        e.preventDefault();
        setIsEditorOpen(true);
      },
    },
    {
      keys: "shift+c",
      action: (e) => {
        e.preventDefault();
        setIsColorPickerOpen(true);
      },
    },
    {
      keys: "mod+d",
      action: (e) => {
        e.preventDefault();
        imageDownloader(persistedImageUrl);
      },
    },
    {
      keys: "mod+q",
      action: (e) => {
        e.preventDefault();
        scanQRfromImage();
      },
    },
    {
      keys: "mod+i",
      action: (e) => {
        e.preventDefault();
        handleImageExif(persistedImageUrl);
      },
    },
  ];

  hotkeys.forEach(({ keys, action }) => {
    useHotkeys(keys, action);
  });
}