export const uploadToImgbb = async (
  imageBase64: string,
  expiration: number = 0
): Promise<any> => {
  const IMGBB_API_KEY = "8be35a61597b285f9c95669fdc565b00";
  const formData = new FormData();
  const base64Data = imageBase64.split(",")[1]; // Split the base64 string and take the second part
  formData.append("image", base64Data);
  let requestOptions = {
    method: "POST",
    body: formData,
  };

  // If expiration is not 0, add it to the URL
  let url = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
  if (expiration !== 0) {
    url += `&expiration=${expiration.toString()}`;
  }

  try {
    const response = await fetch(url, requestOptions);
    const result = await response.json();
    return result;
  } catch (error) {
    console.log("error", error);
    throw error;
  }
};
