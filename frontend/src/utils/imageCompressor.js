/**
 * Client-Side Image Compression Utility
 * Compresses images that exceed maximum byte limits (e.g. 2MB) prior to network upload.
 * E-Botar v4.0.0
 */

export async function compressImageClientSide(file, maxBytes = 2 * 1024 * 1024, maxDimension = 1600) {
  if (!file || !file.type.startsWith('image/') || file.size <= maxBytes) {
    return file;
  }

  // SVGs and ICOs are vector/specialized formats that shouldn't be canvas-rasterized
  if (file.type === 'image/svg+xml' || file.type === 'image/x-icon' || file.type === 'image/vnd.microsoft.icon') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Maintain aspect ratio while bounding maximum dimension
        if (Math.max(width, height) > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // Fallback to original if canvas context unavailable
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Determine best format: JPEG or WebP, or PNG if alpha is needed
        const hasAlpha = file.type === 'image/png';
        const targetMime = hasAlpha ? 'image/png' : 'image/jpeg';
        let quality = 0.85;

        function attemptBlob(currentQuality) {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return resolve(file);
              }

              // If still over limit and quality can be reduced
              if (blob.size > maxBytes && currentQuality > 0.4 && !hasAlpha) {
                attemptBlob(currentQuality - 0.15);
                return;
              }

              // If PNG with alpha is still too big, convert to WebP with alpha support
              if (blob.size > maxBytes && hasAlpha) {
                canvas.toBlob(
                  (webpBlob) => {
                    if (webpBlob && webpBlob.size < blob.size) {
                      const compressedFile = new File([webpBlob], file.name.replace(/\.png$/i, '.webp'), {
                        type: 'image/webp',
                        lastModified: Date.now(),
                      });
                      resolve(compressedFile);
                    } else {
                      const compressedFile = new File([blob], file.name, {
                        type: blob.type,
                        lastModified: Date.now(),
                      });
                      resolve(compressedFile);
                    }
                  },
                  'image/webp',
                  0.85
                );
                return;
              }

              const compressedFile = new File([blob], file.name, {
                type: blob.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            targetMime,
            currentQuality
          );
        }

        attemptBlob(quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
