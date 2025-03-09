import { useState } from "react";

function base64ToBlobUrl(base64: string): string {
  // Split the base64 string to get the content type and base64 data
  const parts = base64.split(",");
  const mimeMatch = parts[0].match(/:(.*?);/);

  if (!mimeMatch) {
    throw new Error("Invalid base64 string");
  }

  const mimeType = mimeMatch[1];
  const byteString = atob(parts[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([arrayBuffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

async function imageUrlToBlobUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:image")) {
    return base64ToBlobUrl(imageUrl);
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch image");
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    throw new Error("Error converting image URL to Blob URL: " + error);
  }
}

// convert to base64 from url or bloburl
const imageToBase64 = (
  imageRef: React.RefObject<HTMLImageElement>
): Promise<string> => {
  console.log("imageRef", imageRef);

  return new Promise((resolve, reject) => {
    const img = imageRef.current;
    if (!img) {
      reject("Image reference is null");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject("Failed to get canvas context");
      return;
    }

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

    const base64String = canvas.toDataURL("image/png"); // You can change format if needed
    resolve(base64String);
  });
};

const imageRefToArrayBuffer = async (imageRef) => {
  return new Promise((resolve, reject) => {
    // Create a canvas and draw the image on it
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Ensure the image is loaded
    if (imageRef.complete && imageRef.naturalWidth !== 0) {
      canvas.width = imageRef.width;
      canvas.height = imageRef.height;
      ctx.drawImage(imageRef, 0, 0);

      // Convert canvas to Blob and then to ArrayBuffer
      canvas.toBlob(
        (blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result); // ArrayBuffer
          };
          reader.onerror = (error) => {
            reject(error);
          };
          reader.readAsArrayBuffer(blob); // Convert blob to ArrayBuffer
        },
        "image/png" // You can change the image format here if needed
      );
    } else {
      reject(new Error("Image is not loaded"));
    }
  });
};


export { imageUrlToBlobUrl, base64ToBlobUrl, imageToBase64 };
