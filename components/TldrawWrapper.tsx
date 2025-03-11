import {
  AssetRecordType,
  createShapeId,
  Tldraw,
  useEditor,
  DefaultColorStyle,
  Editor,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";

import SaveIcon from "./SaveIcon";

function add_img(editor, imgSrc, imageWidth, imageHeight, xPos, yPos) {
  const assetId = AssetRecordType.createId();
  const shapeId = createShapeId();
  editor.createAssets([
    {
      id: assetId,
      type: "image",
      typeName: "asset",
      props: {
        name: "tldraw.png",
        src: imgSrc,
        w: imageWidth,
        h: imageHeight,
        mimeType: "image/png",
        isAnimated: false,
      },
      meta: {},
    },
  ]);

  editor.createShape({
    id: shapeId,
    type: "image",
    x: xPos,
    y: yPos,
    isLocked: true,
    props: {
      assetId,
      w: imageWidth,
      h: imageHeight,
    },
  });

  return shapeId;
}

const convertSvgToImage = (svgElement, format = "png", quality = 1.0) => {
  return new Promise((resolve, reject) => {
    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width =
          svgElement.viewBox.baseVal.width || svgElement.clientWidth;
        canvas.height =
          svgElement.viewBox.baseVal.height || svgElement.clientHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        URL.revokeObjectURL(url);

        if (format === "svg") {
          resolve(svgData);
        } else {
          canvas.toBlob(
            (blob) => {
              resolve(URL.createObjectURL(blob));
            },
            `image/${format}`,
            quality
          );
        }
      };

      img.onerror = (err) => {
        reject(err);
      };

      img.src = url;
    } catch (error) {
      reject(error);
    }
  });
};

function ExportButton({ onSave }) {
  const editor = useEditor();
  return (
    <div
      style={{
        pointerEvents: "all",
        width: "100%",
        padding: "10px",
      }}
    >
      <button
        onClick={async () => {
          const shapeIds = editor.getCurrentPageShapeIds();
          const svg = await editor.getSvg([...shapeIds]);
          const img = await convertSvgToImage(svg, "png", 1.0);
          onSave(img);
        }}
        className="w-full px-4 py-1 inline-flex items-center justify-center text-sm font-medium leading-6 text-gray-900 whitespace-no-wrap bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:shadow-none"
      >
        <SaveIcon /> Save Image
      </button>
    </div>
  );
}

const blobUrlToBase64 = (blobUrl) => {
  return new Promise((resolve, reject) => {
    fetch(blobUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
};

const TldrawWrapper = ({
  imageRef,
  onSave,
}: {
  imageRef: any;
  onSave: (img: string) => void;
}) => {
  const handleMount = (editor: Editor) => {
    (async () => {
      let imgSrc = imageRef.src;
      if (imgSrc.startsWith("blob:")) {
        imgSrc = await blobUrlToBase64(imgSrc);
      }
      add_img(editor, imgSrc, imageRef.width, imageRef.height, 0, 0);

      editor.updateInstanceState({
        isDebugMode: false,
      });
      editor.setCurrentTool("draw");
      editor.setStyleForNextShapes(DefaultColorStyle, "red");
      editor.zoomToFit();
      editor.zoomIn(editor.getViewportScreenCenter());
      
    })();
  };

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw
        inferDarkMode
        components={{
          PageMenu: null,
          SharePanel: () => <ExportButton onSave={onSave} />,
        }}
        onMount={handleMount}
      />
    </div>
  );
};

export default TldrawWrapper;
