import React, { useState, useRef } from "react";
import { type CropperRef, Cropper } from "react-mobile-cropper";
import "react-mobile-cropper/dist/style.css";
import { toast } from "sonner";
import { imageUrlToBlobUrl } from "~utils/imageConverter";

const ImageCropper = ({ imageSrc, width, height, updateCroppedImage }) => {
  const [image, setImage] = useState(imageSrc);
  const cropperRef = useRef<CropperRef>(null);

  const onCrop = async () => {
    if (cropperRef.current) {
      const croppedCanvas = cropperRef.current.getCanvas();
      const croppedImage = croppedCanvas.toDataURL();
      // convert it to blob url
      const croppedImageBlobUrl = await imageUrlToBlobUrl(croppedImage);
      setImage(croppedImageBlobUrl);
      updateCroppedImage(croppedImageBlobUrl);
      toast.success("Image cropped successfully");
    }
  };

  return (
    <div className="relative w-full h-[calc(100%-70px)] bg-black">
      <Cropper
        key={`${width}-${height}`}
        ref={cropperRef}
        src={image}
        className="cropper w-full h-full"
      />
      <button
        onClick={onCrop}
        className="fixed left-1/2 transform -translate-x-1/2 px-4 py-2 bg-white text-black border-none cursor-pointer rounded w-full"
      >
        Crop & Save
      </button>
    </div>
  );
};

export default ImageCropper;
