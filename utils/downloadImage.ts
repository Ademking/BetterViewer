export const imageDownloader = (url) => {
  // check if base64 image or not
  if (url.startsWith("data:image")) {
    // get the extension of the image from base64 string
    const extension = url.split(";")[0].split("/")[1];
    const a = document.createElement("a");
    a.href = url;
    const currentTimestamp = new Date().getTime();
    a.download = `image-${currentTimestamp}.${extension}`;
    a.click();
  } else {
    const a = document.createElement("a");
    a.href = url;
    const currentTimestamp = new Date().getTime();
    a.download = `image-${currentTimestamp}.png`;
    a.click();
  }
};
