/**
 * Resize + compress an image file on-device before upload.
 * Mobile cameras produce 5-12 MB JPEGs; this brings them to ~200-500 KB.
 * Falls back to the original file on any error or in non-browser environments.
 */
export async function compressImage(
  file: File,
  maxDimension = 2048,
  quality = 0.85,
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 512 * 1024) {
        resolve(file); // already small — skip recompression
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(
          new File([blob!], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }),
        ),
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
