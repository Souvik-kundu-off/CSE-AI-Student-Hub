import { useState, useRef } from "react";
import { uploadToStorage } from "@/lib/storage";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageMultiUploadProps {
  /** Current list of image URLs */
  images: string[];
  /** Called with the updated list after upload/remove */
  onChange: (urls: string[]) => void;
  /** Max number of images allowed */
  maxImages?: number;
  /** Max file size in MB per image */
  maxSizeMB?: number;
  /** Storage folder path */
  folder?: string;
  /** Label */
  label?: string;
}

const ImageMultiUpload = ({
  images,
  onChange,
  maxImages = 6,
  maxSizeMB = 10,
  folder = "tech-hub/projects",
  label,
}: ImageMultiUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);

    if (images.length + fileArr.length > maxImages) {
      toast.error(`Max ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of fileArr) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${maxSizeMB}MB`);
        continue;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      try {
        const url = await uploadToStorage(file, folder);
        newUrls.push(url);
      } catch (e: any) {
        toast.error(`Failed: ${file.name}`);
      }
    }

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
      toast.success(`${newUrls.length} image${newUrls.length > 1 ? "s" : ""} uploaded (auto-compressed WebP)!`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label} ({images.length}/{maxImages})
        </label>
      )}

      {/* Grid of uploaded images + dropzone */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((url, i) => (
          <div key={i} className="relative group aspect-video rounded-xl overflow-hidden border border-white/10 bg-accent/30">
            <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 bg-accent/10 hover:bg-accent/20 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin text-primary" />
                <span className="text-[10px]">Compressing...</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span className="text-[10px] font-medium">+ Add Images</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
};

export default ImageMultiUpload;
