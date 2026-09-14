import { useState, useRef } from "react";
import { uploadToStorage } from "@/lib/storage";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  /** Called with the download URL after successful upload */
  onUpload: (url: string) => void;
  /** Storage folder path */
  folder?: string;
  /** Current image URL (for preview) */
  currentUrl?: string;
  /** Called when the image is cleared */
  onClear?: () => void;
  /** Label text above the upload area */
  label?: string;
  /** Max file size in MB (default: 10) */
  maxSizeMB?: number;
  /** Accept specific file types */
  accept?: string;
  /** Display variant */
  variant?: "default" | "compact" | "avatar";
  /** Whether upload is disabled */
  disabled?: boolean;
}

const ImageUpload = ({
  onUpload,
  folder = "tech-hub",
  currentUrl,
  onClear,
  label,
  maxSizeMB = 10,
  accept = "image/*",
  variant = "default",
  disabled = false,
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Max ${maxSizeMB}MB.`);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported.");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadToStorage(file, folder);
      onUpload(url);
      toast.success("Image uploaded (auto-compressed to WebP)!");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    }
    setUploading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Avatar variant - circular
  if (variant === "avatar") {
    return (
      <div className="space-y-2">
        {label && <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{label}</label>}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center overflow-hidden border-2 border-white/10 shrink-0">
            {currentUrl ? (
              <img src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={20} className="text-muted-foreground" />
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? "Compressing..." : "Change"}
            </button>
            {currentUrl && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-medium hover:bg-red-500/20 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      </div>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div className="space-y-1.5">
        {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
        {currentUrl ? (
          <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-accent/30 p-2 flex items-center gap-3">
            <img src={currentUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-foreground">Image uploaded</p>
              <p className="text-[10px] text-muted-foreground truncate">Stored on Firebase</p>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
            className="w-full h-20 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 bg-accent/20 hover:bg-accent/40 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 size={18} className="animate-spin text-primary" /> : <Upload size={18} />}
            <span>{uploading ? "Compressing & Uploading..." : "Upload Image"}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      </div>
    );
  }

  // Default variant - large dropzone
  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>}

      {currentUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-accent/20 p-2 group">
          <img src={currentUrl} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-2xl">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium backdrop-blur-md transition-all flex items-center gap-1.5"
            >
              <Upload size={14} /> Change
            </button>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="px-3 py-1.5 rounded-xl bg-red-500/30 hover:bg-red-500/50 text-white text-xs font-medium backdrop-blur-md transition-all flex items-center gap-1.5"
              >
                <X size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && fileRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-white/10 hover:border-primary/40 bg-accent/10 hover:bg-accent/20"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {uploading ? (
            <>
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Loader2 size={24} className="animate-spin" />
              </div>
              <p className="text-xs font-medium text-foreground">Compressing to WebP & Uploading...</p>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Upload size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Click or drag image to upload</p>
                <p className="text-xs text-muted-foreground mt-0.5">Auto-compressed to WebP (Max {maxSizeMB}MB)</p>
              </div>
            </>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
    </div>
  );
};

export default ImageUpload;
