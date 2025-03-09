import {
  binarize,
  Byte,
  Decoder,
  Detector,
  Encoder,
  grayscale,
} from "@nuintun/qrcode";

export const decodeQRCode = (imageUrl: string): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.addEventListener("error", () => {
      console.error("image load error");
      reject("image load error");
    });

    image.addEventListener("load", () => {
      const { width, height } = image;
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d")!;

      context.drawImage(image, 0, 0);

      const luminances = grayscale(context.getImageData(0, 0, width, height));
      const binarized = binarize(luminances, width, height);
      const detector = new Detector();
      const detected = detector.detect(binarized);
      const decoder = new Decoder();

      let current = detected.next();
      let qrCodeValue: string | null = null;

      while (!current.done) {
        let succeed = false;

        const detect = current.value;
        if (!detect) {
          current = detected.next();
          continue;
        }

        try {
          const decoded = decoder.decode(detect.matrix);
          qrCodeValue = decoded.content;
          succeed = true;
          break;
        } catch {
          // Decode failed, skipping...
        }

        current = detected.next(succeed);
      }

      resolve(qrCodeValue);
    });

    image.src = imageUrl;
  });
};
