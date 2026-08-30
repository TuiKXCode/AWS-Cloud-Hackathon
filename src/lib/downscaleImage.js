/**
 * Centre-crop and shrink a picked image to a square data URL.
 *
 * Two reasons this exists: localStorage has a few megabytes to play with and a raw phone
 * photo will blow through that, and the sprite head is only ever drawn small anyway.
 */
export function downscaleImageFile(file, size = 256, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not decode that image'));
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d');

          // cover-crop: fill the square, centred, no distortion
          const scale = Math.max(size / image.width, size / image.height);
          const width = image.width * scale;
          const height = image.height * scale;
          context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);

          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (error) {
          reject(error);
        }
      };
      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}
