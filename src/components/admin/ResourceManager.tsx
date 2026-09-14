import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ensureUrl } from "@/lib/utils-url";
import { 
  BookOpen, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  Loader2, 
  ExternalLink,
  Code,
  FileText,
  Video,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
  category: string;
  created_at: string;
}

const ResourceManager = ({ readonly = false }: { readonly?: boolean }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    type: "tool",
    category: ""
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "resources"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      setResources(snap.docs.map(d => ({ id: d.id, ...d.data() } as Resource)));
    } catch {
      toast.error("Failed to load resources");
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing("create");

    try {
      await addDoc(collection(db, "resources"), { ...formData, created_at: serverTimestamp() });
      toast.success("Resource added successfully!");
      setIsCreating(false);
      setFormData({ title: "", description: "", url: "", type: "tool", category: "" });
      fetchResources();
    } catch {
      toast.error("Failed to add resource");
    }
    setProcessing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently remove this resource?")) return;
    
    setProcessing(id);
    try {
      await deleteDoc(doc(db, "resources", id));
      toast.success("Resource removed");
      setResources(prev => prev.filter(r => r.id !== id));
    } catch {
      toast.error("Deletion failed");
    }
    setProcessing(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tutorial': return <Video size={18} />;
      case 'guide': return <FileText size={18} />;
      case 'template': return <Code size={18} />;
      default: return <Wrench size={18} />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen size={20} className="text-primary" /> Community Resources
          </h2>
          <p className="text-sm text-muted-foreground">Manage external tools, guides, and developer templates.</p>
        </div>
        {!readonly && (
        <Button 
          onClick={() => setIsCreating(!isCreating)} 
          className="rounded-xl gap-2 font-bold"
        >
          {isCreating ? <FileText size={18} /> : <Plus size={18} />}
          {isCreating ? "View List" : "Add Resource"}
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
            className="bg-card border border-white/10 rounded-[32px] p-6 md:p-8 space-y-6 shadow-2xl shadow-primary/5"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Resource Title</label>
                <Input 
                  required
                  placeholder="e.g. Mastering Tailwind CSS"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="bg-black/20 border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Resource Type</label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger className="bg-black/20 border-white/10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tool">Developer Tool</SelectItem>
                    <SelectItem value="tutorial">Video Tutorial</SelectItem>
                    <SelectItem value="guide">Documentation/Guide</SelectItem>
                    <SelectItem value="template">Project Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Internal Link / URL</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    required
                    placeholder="https://..."
                    value={formData.url}
                    onChange={e => setFormData({...formData, url: e.target.value})}
                    className="pl-10 bg-black/20 border-white/10 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Category (Optional)</label>
                <Input 
                  placeholder="e.g. Frontend, Backend, AI"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="bg-black/20 border-white/10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Short Description</label>
              <Textarea 
                required
                placeholder="What is this resource and how does it help members?"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="bg-black/20 border-white/10 rounded-xl min-h-[100px]"
              />
            </div>

            <Button 
              type="submit" 
              disabled={processing === "create"}
              className="w-full bg-primary text-primary-foreground font-black h-12 rounded-2xl shadow-lg shadow-primary/20"
            >
              {processing === "create" ? <Loader2 className="animate-spin" /> : "Publish Resource"}
            </Button>
          </motion.form>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {loading ? (
              <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : resources.length === 0 ? (
              <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-[32px]">
                <p className="text-muted-foreground">The resource library is currently empty.</p>
              </div>
            ) : (
              resources.map(res => (
                <div key={res.id} className="bg-card/50 border border-white/5 rounded-2xl p-5 flex items-start justify-between group hover:border-primary/20 transition-all">
                  <div className="flex gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex flex-shrink-0 items-center justify-center text-primary border border-white/10">
                      {getTypeIcon(res.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold truncate text-sm">{res.title}</h4>
                        {res.category && (
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {res.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{res.description}</p>
                      <a 
                        href={ensureUrl(res.url)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline"
                      >
                        <ExternalLink size={12} /> Visit Resource
                      </a>
                    </div>
                  </div>
                  {!readonly && (
                  <button 
                    onClick={() => handleDelete(res.id)}
                    disabled={processing === res.id}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {processing === res.id ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 size={16} />}
                  </button>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResourceManager;
