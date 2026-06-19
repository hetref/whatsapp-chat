/**
 * Compresses an image file if it exceeds the maximum size limit (default: 5MB for WhatsApp).
 * If the image is a PNG and exceeds the limit, it will be converted to JPEG for lossy compression.
 */
export async function compressImageIfNeeded(file: File, maxSizeBytes: number = 5 * 1024 * 1024): Promise<File> {
  // Only process image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // If the file is already under the size limit, return it unchanged
  if (file.size <= maxSizeBytes) {
    return file;
  }

  console.log(`[ImageCompression] Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) to fit under ${(maxSizeBytes / 1024 / 1024).toFixed(1)} MB`);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize down if resolution is exceptionally high to keep file size reasonable
        const MAX_DIMENSION = 2048;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.warn('[ImageCompression] Canvas context not available. Returning original file.');
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert PNG to JPEG if compressing to ensure lossy compression is effective
        const outputMime = file.type === 'image/png' ? 'image/jpeg' : file.type;
        const extension = file.type === 'image/png' ? '.jpg' : file.name.substring(file.name.lastIndexOf('.'));
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const outputName = `${baseName}${extension}`;

        let quality = 0.85;

        const attemptCompression = (q: number) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              console.warn('[ImageCompression] Failed to generate canvas blob. Returning original file.');
              resolve(file);
              return;
            }

            console.log(`[ImageCompression] Compression attempt with quality ${q.toFixed(2)} resulted in size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

            if (blob.size > maxSizeBytes && q > 0.1) {
              // Iterate and reduce quality
              attemptCompression(q - 0.15);
            } else {
              const compressedFile = new File([blob], outputName, {
                type: outputMime,
                lastModified: Date.now(),
              });
              console.log(`[ImageCompression] Successfully compressed image to ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB)`);
              resolve(compressedFile);
            }
          }, outputMime, q);
        };

        attemptCompression(quality);
      };
      img.onerror = () => {
        console.warn('[ImageCompression] Failed to load image. Returning original file.');
        resolve(file);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      console.warn('[ImageCompression] Failed to read file. Returning original file.');
      resolve(file);
    };
    reader.readAsDataURL(file);
  });
}
