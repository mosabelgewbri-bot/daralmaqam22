/**
 * Resizes a base64 image to a maximum width and height while maintaining aspect ratio.
 * Returns a promise that resolves to the resized base64 image (JPEG format).
 */
export const resizeImage = (base64: string, maxWidth = 1200, maxHeight = 1200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      // Use 0.8 quality to reduce payload size further
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      // If error, return original image
      resolve(base64);
    };
    img.src = base64;
  });
};
