import React from "react";
import FilerobotImageEditor, {
  TABS,
  TOOLS,
} from "react-filerobot-image-editor";
import { createEditorConfig } from "~config/EditorConfig";
import "utils/suppressWarnings"; // Suppress warnings from react-filerobot-image-editor package
import { imageUrlToBlobUrl } from "~utils/imageConverter";

export default function ImageEditor({ imageUrl, onImageSave }) {
  return (
    imageUrl && (
      <FilerobotImageEditor
        onBeforeSave={() => {
          return false;
        }}
        onSave={async (data) => {
          let imageBlobUrl = await imageUrlToBlobUrl(data.imageBase64);
          onImageSave(imageBlobUrl);
        }}
        defaultSavedImageQuality={1}
        {...createEditorConfig(imageUrl)}
      />
    )
  );
}
