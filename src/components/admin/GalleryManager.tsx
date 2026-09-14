import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import {
  Image as ImageIcon, Plus, Trash2, Loader2, GripVertical, X,
  Eye, EyeOff, Upload, FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { logAdminAction } from "./AuditLog";
import ImageUpload from "@/components/ui/ImageUpload";

interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  album: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

const emptyForm = {
  title: "",
  caption: "",
  image_url: "",
  album: "",
  sort_order: 0,
  is_visible: true,
};

const GalleryManager = ({ readonly = false }: { readonly?: boolean }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [filterAlbum, setFilterAlbum] = useState<string>("all");

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "gallery_items"), orderBy("sort_order", "asc"));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem)));
    } catch {
      toast.error("Failed to load gallery");
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing("create");

    const insertData = {
      ...formData,
      sort_order: items.length,
    };

    try {
      await addDoc(collection(db, "gallery_items"), { ...insertData, created_at: serverTimestamp() });
      toast.success("Image added to gallery!");
      await logAdminAction({
        actionType: "CREATE",
        targetType: "GALLERY",
        targetId: "",
        targetLabel: formData.title || "Gallery Image",
        details: `Added to album: ${formData.album || "Uncategorized"}`,
      });
      setIsCreating(false);
      setFormData(emptyForm);
      fetchItems();
    } catch {
      toast.error("Failed to add image");
    }
    setProcessing(null);
  };

  const toggleVisibility = async (item: GalleryItem) => {
    setProcessing(item.id);
    try {
      await updateDoc(doc(db, "gallery_items", item.id), { is_visible: !item.is_visible });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_visible: !i.is_visible } : i));
      toast.success(item.is_visible ? "Hidden from gallery" : "Visible in gallery");
    } catch {
      toast.error("Update failed");
    }
    setProcessing(null);
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!confirm("Permanently remove this gallery image?")) return;
    setProcessing(item.id);

    try {
      await deleteDoc(doc(db, "gallery_items", item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success("Image removed");
      await logAdminAction({
        actionType: "DELETE",
        targetType: "GALLERY",
        targetId: item.id,
        targetLabel: item.title || "Gallery Image",
        details: `Removed from album: ${item.album || "Uncategorized"}`,
      });
    } catch {
      toast.error("Delete failed");
    }
    setProcessing(null);
  };

  const albums = [...new Set(items.map(i => i.album).filter(Boolean))];
  const filteredItems = filterAlbum === "all" ? items : items.filter(i => i.album === filterAlbum);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ImageIcon size={20} className="text-primary" /> Gallery Manager
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage photos and their albums. {items.length} total images.
          </p>
        </div>
        {!readonly && (
        <Button
          onClick={() => setIsCreating(!isCreating)}
          className="rounded-xl gap-2 font-bold"
        >
          {isCreating ? <FolderOpen size={18} /> : <Plus size={18} />}
          {isCreating ? "View Gallery" : "Add Image"}
        </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isCreating ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleCreate}
            className="bg-card border border-white/10 rounded-[28px] p-6 md:p-8 space-y-6 shadow-2xl shadow-primary/5"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Title</label>
                <Input
                  required
                  placeholder="e.g. HackFusion 2025 - Group Photo"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="bg-black/20 border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Album</label>
                <Input
                  placeholder="e.g. HackFusion 2025, Team Outing"
                  value={formData.album}
                  onChange={e => setFormData({ ...formData, album: e.target.value })}
                  className="bg-black/20 border-white/10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <ImageUpload
                label="Upload Image"
                folder="tech-hub/gallery"
                currentUrl={formData.image_url}
                onUpload={(url) => setFormData({ ...formData, image_url: url })}
                onClear={() => setFormData({ ...formData, image_url: "" })}
              />
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] text-muted-foreground font-medium">or paste a URL</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <Input
                placeholder="https://images.unsplash.com/..."
                value={formData.image_url}
                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                className="bg-black/20 border-white/10 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Caption (Optional)</label>
              <Textarea
                placeholder="A short description of this photo..."
                value={formData.caption}
                onChange={e => setFormData({ ...formData, caption: e.target.value })}
                className="bg-black/20 border-white/10 rounded-xl min-h-[80px]"
              />
            </div>

            <Button
              type="submit"
              disabled={processing === "create"}
              className="w-full bg-primary text-primary-foreground font-black h-12 rounded-2xl shadow-lg shadow-primary/20"
            >
              {processing === "create" ? <Loader2 className="animate-spin" /> : "Add to Gallery"}
            </Button>
          </motion.form>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Album filter */}
            {albums.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setFilterAlbum("all")}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                    filterAlbum === "all" ? "bg-primary/10 text-primary" : "bg-white/5 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({items.length})
                </button>
                {albums.map(album => (
                  <button
                    key={album}
                    onClick={() => setFilterAlbum(album)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                      filterAlbum === album ? "bg-primary/10 text-primary" : "bg-white/5 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {album} ({items.filter(i => i.album === album).length})
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : filteredItems.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-[28px]">
                <p className="text-muted-foreground">No gallery images found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className={`group relative border border-white/5 rounded-2xl overflow-hidden bg-card/50 transition-all hover:border-primary/20 ${
                      !item.is_visible ? "opacity-50" : ""
                    }`}
                  >
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-[11px] truncate">{item.title}</h4>
                      {item.album && (
                        <span className="text-[9px] font-medium text-primary">{item.album}</span>
                      )}
                      {item.caption && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.caption}</p>
                      )}
                    </div>
                    {/* Actions overlay — write only */}
                    {!readonly && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleVisibility(item)}
                        disabled={processing === item.id}
                        className="p-1.5 rounded-lg bg-black/60 backdrop-blur text-white hover:bg-black/80 transition-colors"
                      >
                        {item.is_visible ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={processing === item.id}
                        className="p-1.5 rounded-lg bg-black/60 backdrop-blur text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GalleryManager;
