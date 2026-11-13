/**
 * Image compressor utility for comic cover photos.
 * Downscales large smartphone photos (often 5-15MB) to max 1200px at 0.82 JPEG quality (~120KB).
 * This prevents upload timeouts and enables ultra-fast Gemini vision processing (< 2 seconds).
 */
export async function compressImageBase64(base64Str: string, maxDimension = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    // If not a data url or running outside browser, return as is
    if (!base64Str || typeof window === 'undefined' || !base64Str.startsWith('data:image')) {
      return resolve(base64Str);
    }

    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
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
        return resolve(base64Str);
      }

      // Draw with smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };

    img.onerror = () => {
      resolve(base64Str);
    };

    img.src = base64Str;
  });
}

export async function compressFileToBase64(file: File, maxDimension = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawBase64 = e.target?.result as string;
      if (!rawBase64) {
        return reject(new Error('Falha ao ler arquivo de imagem.'));
      }
      try {
        const compressed = await compressImageBase64(rawBase64, maxDimension, quality);
        resolve(compressed);
      } catch (err) {
        resolve(rawBase64);
      }
    };
    reader.onerror = () => reject(new Error('Erro no carregamento do arquivo'));
    reader.readAsDataURL(file);
  });
}
