import { useHotkeys } from "react-hotkeys-hook";
import { imageDownloader } from "~utils/downloadImage";

export default function initHotKeys({
  viewerRef,
  setIsCropperOpen,
  setIsEditorOpen,
  setIsColorPickerOpen,
  persistedImageUrl,
  scanQRfromImage,
  handleImageExif,
}: {
  viewerRef: any;
  setIsCropperOpen: (value: boolean) => void;
  setIsEditorOpen: (value: boolean) => void;
  setIsColorPickerOpen: (value: boolean) => void;
  persistedImageUrl: string;
  scanQRfromImage: () => void;
  handleImageExif: (persistedImageUrl: string) => void;
}) {
  const hotkeys = [
    {
      keys: "mod+add, add",
      action: (e) => {
        if (viewerRef.current) {
          viewerRef.current.zoom(0.2);
        }
      },
    },
    {
      keys: "mod+subtract, subtract",
      action: (e) => {
        if (viewerRef.current) {
          viewerRef.current.zoom(-0.2);
        }
      },
    },
    {
      keys: "0, mod+0",
      action: (e) => {
        if (viewerRef.current) {
          viewerRef.current.zoomTo(1);
        }
      },
    },
    {
      keys: "shift+left",
      action: (e) => {
        if (viewerRef.current) {
          viewerRef.current.rotate(-90);
        }
      },
    },
    {
      keys: "shift+right",
      action: (e) => {
        if (viewerRef.current) {
          viewerRef.current.rotate(90);
        }
      },
    },
    {
      keys: "mod+down, mod+up",
      action: (e) => {
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
        setIsCropperOpen(true);
      },
    },
    {
      keys: "mod+e",
      action: (e) => {
        setIsEditorOpen(true);
      },
    },
    {
      keys: "shift+c",
      action: (e) => {
        setIsColorPickerOpen(true);
      },
    },
    {
      keys: "mod+d",
      action: (e) => {
        imageDownloader(persistedImageUrl);
      },
    },
    {
      keys: "mod+q",
      action: (e) => {
        scanQRfromImage();
      },
    },
    {
      keys: "mod+i",
      action: (e) => {
        handleImageExif(persistedImageUrl);
      },
    },
  ];

  return hotkeys;
}
