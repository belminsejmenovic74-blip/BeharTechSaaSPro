// image-capture — lecture + compression d'une photo (appareil photo ou fichier) en data URL.
// Les photos sont stockées localement (store persisté) : on les redimensionne pour ne pas
// saturer le localStorage. Fonctionne sur PC (fichier) comme sur tablette/mobile (caméra).

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = src;
  });

const fitSize = (width: number, height: number, max: number) => {
  if (width <= max && height <= max) return { width, height };
  const ratio = width > height ? max / width : max / height;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
};

/**
 * Convertit un fichier image en data URL JPEG compressée.
 * @param maxSize côté max en px (redimensionnement proportionnel)
 * @param quality qualité JPEG 0..1
 */
export async function fileToCompressedDataUrl(file: File, maxSize = 1000, quality = 0.68): Promise<string> {
  const original = await readAsDataUrl(file);
  try {
    const image = await loadImage(original);
    const { width, height } = fitSize(image.naturalWidth || image.width, image.naturalHeight || image.height, maxSize);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    // En cas d'échec (format exotique, etc.) on garde l'original.
    return original;
  }
}
