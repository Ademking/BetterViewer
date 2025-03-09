import React from "react";
import ReactJson from "react-json-view";

const JsonViewer = ({ data }) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const jsonData = JSON.parse(jsonStr);

  return (
    <div className="json-viewer-container">
      <ReactJson
        src={jsonData}
        name="Image Details"
        enableClipboard={(copy: any) => {
          // convert to string if it's an object
          if (typeof copy.src === "object") {
            copy.src = JSON.stringify(copy.src, null, 2);
          }
          navigator.clipboard.writeText(copy.src);
        }}
        displayObjectSize={false}
        displayDataTypes={false}
        quotesOnKeys={false}
        theme={"shapeshifter"}
        style={{
          backgroundColor: "transparent",
        }}
      />
    </div>
  );
};

export default JsonViewer;
