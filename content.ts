import type { PlasmoCSConfig } from "plasmo";
import { sendToBackground } from "@plasmohq/messaging";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_end",
};

try {
  const body = document.body;
  const isStyledCorrectly = body.getAttribute("style") === "margin: 0px; height: 100%; background-color: rgb(14, 14, 14);";
  const hasSingleImageChild = body.children.length === 1 && body.children[0]?.tagName === "IMG";
  const isImageSrcMatching = body.children[0]?.getAttribute("src") === window.location.href;

  if (isStyledCorrectly && hasSingleImageChild && isImageSrcMatching) {
    sendToBackground({
      name: "openImageInNewTab" as never,
      body: {
        src: body.children[0]?.getAttribute("src"),
      },
    });
  }
} catch (error) {
  console.error("An error occurred:", error);
}