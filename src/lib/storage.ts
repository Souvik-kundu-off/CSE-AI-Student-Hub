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
 * Helper to convert compressed file to Base64 Data URL as a fail-safe fallback
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Automatically compresses image to WebP and uploads to Storage.
 * Supports:
 * 1. Cloudinary (if VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are set)
 * 2. Firebase Storage (if enabled)
 * 3. Base64 Data URL fallback (zero setup needed, works immediately)
 * 
 * @param file - The File object to upload
 * @param folder - Storage folder path (e.g. "projects", "events", "gallery")
 * @returns Public URL of the uploaded image
 */
export const uploadToStorage = async (
  file: File,
  folder: string = "uploads"
): Promise<string> => {
  // Compress image to WebP before uploading
  const compressedFile = await compressImageToWebP(file);

  // 1. Try Cloudinary if environment variables are configured
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return data.secure_url;
      }
    } catch (cErr) {
      console.warn("Cloudinary upload failed, falling back...", cErr);
    }
  }

  // 2. Try Firebase Storage
  try {
    const timestamp = Date.now();
    const sanitizedName = compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fullPath = `${folder}/${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, fullPath);
    const snapshot = await uploadBytes(storageRef, compressedFile);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error: any) {
    console.warn("Firebase Storage unavailable, falling back to WebP Data URL:", error);
    // 3. Fail-safe fallback: return compressed WebP Base64 Data URL
    // WebP compression reduces file size to ~30-80KB, so Data URLs work reliably in Firestore
    return await fileToBase64(compressedFile);
  }
};
