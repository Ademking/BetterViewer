import React, { useCallback, useEffect, useRef, useState } from "react";
import Pickr from "@simonwep/pickr";
import "@simonwep/pickr/dist/themes/classic.min.css";
import useEyeDropper from "use-eye-dropper";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import ClipboardIcon from "./ClipboardIcon";

export const CopyColorToast = ({ hexColor }) => {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <span
        style={{
          display: "inline-block",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          backgroundColor: hexColor,
          marginRight: "10px",
          border: "1px solid #000",
        }}
      ></span>
      Selected Color: {hexColor}
    </div>
  );
};

const ColorPicker = ({ imageElem, zoomScale, isFlipped }) => {
  const { open, isSupported } = useEyeDropper();
  const pickrRef = useRef(null);
  const colorPickerRef = useRef(null);

  const chromiumColorPicker = async (pickr) => {
    const color = await open();
    pickr.setColor(color.sRGBHex);
    // copy color to clipboard
    navigator.clipboard.writeText(color.sRGBHex).then(
      () => {
        toast(<CopyColorToast hexColor={color.sRGBHex} />, {
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
              navigator.clipboard.writeText(color.sRGBHex);
              toast.success("Copied to clipboard");
            },
          },
        });
      },
      (err) => {
        console.error("Could not copy color to clipboard", err);
      }
    );
  };

  const firefoxColorPicker = async (pickr, e) => {
    if (!imageElem) {
      console.error("imageElem is not defined or is null");
      return;
    }
    const rect = imageElem.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    if (isFlipped) {
      x = rect.width - x;
      y = rect.height - y;
    }

    const canvas = await html2canvas(imageElem, {
      scale: zoomScale,
      useCORS: true,
      windowWidth: imageElem.scrollWidth,
      windowHeight: imageElem.scrollHeight,
    });

    // Adjust coordinates based on the scaling factor
    x = x * zoomScale;
    y = y * zoomScale;

    // get clicked pixel color from canvas (hex color)
    const ctx = canvas.getContext("2d");
    const pixelData = ctx.getImageData(x, y, 1, 1).data;
    const hexColor =
      "#" +
      ((1 << 24) + (pixelData[0] << 16) + (pixelData[1] << 8) + pixelData[2])
        .toString(16)
        .slice(1);

    pickr.setColor(hexColor);

    // copy color to clipboard
    navigator.clipboard.writeText(hexColor).then(
      () => {
        toast(<CopyColorToast hexColor={hexColor} />, {
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
              navigator.clipboard.writeText(hexColor);
              toast.success("Copied to clipboard");
            },
          },
        });
      },
      (err) => {
        console.error("Could not copy color to clipboard", err);
      }
    );
  };

useEffect(() => {
  const initializePickr = () => {
    if (colorPickerRef.current) {
      const pickr = Pickr.create({
        el: colorPickerRef.current,
        inline: true,
        showAlways: true,
        theme: "classic",
        useAsButton: false,
        autoReposition: true,
        appClass: "color-picker-app",
        components: {
          preview: true,
          opacity: false,
          hue: true,
          interaction: {
            hex: true,
            rgba: true,
            hsla: true,
            hsva: true,
            cmyk: true,
            input: true,
          },
        },
      });

      pickrRef.current = pickr;

      const handleImageClick = async (mouseClickEvent) => {
        try {
          if (!isSupported) {
            firefoxColorPicker(pickr, mouseClickEvent);
          } else {
            chromiumColorPicker(pickr);
          }
        } catch (e) {
          console.error(e);
        }
      };

      if (imageElem && imageElem.addEventListener) {
        imageElem.addEventListener("click", handleImageClick);
      } else {
        console.error("imageElem is not a valid DOM element");
      }

      return () => {
        if (imageElem && imageElem.removeEventListener) {
          imageElem.removeEventListener("click", handleImageClick);
        }
      };
    }
  };

  // Delay the initialization to ensure the DOM is fully rendered
  const timeoutId = setTimeout(initializePickr, 0);

  return () => clearTimeout(timeoutId);
}, [imageElem, zoomScale, isFlipped]);
  return (
    <div>
      <div ref={colorPickerRef} className="color-picker"></div>
    </div>
  );
};



export default ColorPicker;