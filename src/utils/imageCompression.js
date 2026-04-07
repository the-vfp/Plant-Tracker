/**
 * Compress an image file to a max-dimension JPEG Blob using Canvas.
 */
async function compressImage(file, maxDimension, quality) {
  const img = new Image();
  const url = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  URL.revokeObjectURL(url);

  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round(height * (maxDimension / width));
      width = maxDimension;
    } else {
      width = Math.round(width * (maxDimension / height));
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
}

/**
 * Process a photo file into a compressed full-size and thumbnail Blob pair.
 */
export async function processPhoto(file) {
  const [blob, thumbnail] = await Promise.all([
    compressImage(file, 1200, 0.8),
    compressImage(file, 200, 0.6),
  ]);
  return { blob, thumbnail, mimeType: 'image/jpeg' };
}
