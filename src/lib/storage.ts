import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Compresses an image file in the browser before upload:
 * - Resizes image if max width/height exceeds 1200px
 * - Converts image to WebP format with 82% quality compression
 */
export const compressImageToWebP = (
  file: File,
  maxDimension: number = 1200,
  quality: number = 0.82
): Promise<File> => {
  return new Promise((resolve) => {
    // If not an image (e.g. PDF or non-raster file), return original file
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
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

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          const compressedFile = new File([blob], compressedName, {
            type: "image/webp",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
};

/**
 * Automatically compresses image to WebP and uploads directly to Firebase Storage.
 * Returns the public download URL of the uploaded image.
 * 
 * @param file - The File object to upload
 * @param folder - Storage folder path (e.g. "projects", "events", "gallery")
 * @returns Public download URL of the uploaded file
 */
export const uploadToStorage = async (
  file: File,
  folder: string = "uploads"
): Promise<string> => {
  // Compress image to WebP before uploading
  const compressedFile = await compressImageToWebP(file);

  const timestamp = Date.now();
  const sanitizedName = compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fullPath = `${folder}/${timestamp}_${sanitizedName}`;
  
  const storageRef = ref(storage, fullPath);
  const snapshot = await uploadBytes(storageRef, compressedFile);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  
  return downloadUrl;
};
