import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { 
  Megaphone, 
  Trash2, 
  Plus, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ToggleLeft,
  ToggleRight
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
import { safeFormatDate } from "@/lib/utils";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  publish_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const BroadcastManager = ({ readonly = false }: { readonly?: boolean }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "info",
    is_active: true,
    publish_at: "",
    expires_at: "",
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "announcements"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      setAnnouncements(snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as Announcement[]);
    } catch (err) {
      toast.error("Failed to load broadcasts");
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing("create");

    const insertData = {
      title: formData.title,
      content: formData.content,
      type: formData.type,
      is_active: formData.is_active,
      publish_at: formData.publish_at || null,
      expires_at: formData.expires_at || null,
    };

    try {
      await addDoc(collection(db, "announcements"), {
        ...insertData,
        created_at: serverTimestamp()
      });
      const isScheduled = formData.publish_at && new Date(formData.publish_at) > new Date();
      toast.success(isScheduled ? "Broadcast scheduled!" : "Broadcast live!");
      setIsCreating(false);
      setFormData({ title: "", content: "", type: "info", is_active: true, publish_at: "", expires_at: "" });
      fetchAnnouncements();
    } catch (err) {
      toast.error("Failed to create broadcast");
    }
    setProcessing(null);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    setProcessing(id);
    try {
      await updateDoc(doc(db, "announcements", id), { is_active: !currentStatus });
      setAnnouncements(prev => 
        prev.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a)
      );
      toast.success("Broadcast status updated");
    } catch (err) {
      toast.error("Update failed");
    }
    setProcessing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will permanently remove the alert.")) return;
    
    setProcessing(id);
    try {
      await deleteDoc(doc(db, "announcements", id));
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success("Broadcast removed");
    } catch (err) {
      toast.error("Delete failed");
    }
    setProcessing(null);
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "critical": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "warning": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "success": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      default: return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone size={20} className="text-primary" /> System Broadcasts
          </h2>
          <p className="text-sm text-muted-foreground">Reach every member instantly with dashboard alerts.</p>
        </div>
        {!readonly && (
        <Button 
          onClick={() => setIsCreating(!isCreating)} 
          className="rounded-xl gap-2 h-10 px-5"
        >
          {isCreating ? <Clock size={18} /> : <Plus size={18} />}
          {isCreating ? "View History" : "New Broadcast"}
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
            className="bg-card border border-white/10 rounded-[24px] p-6 space-y-4 shadow-2xl shadow-primary/5"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Title</label>
                <Input 
                  required
                  placeholder="e.g. Hackathon Registration Open!"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="bg-black/20 border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Type</label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger className="bg-black/20 border-white/10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information (Blue)</SelectItem>
                    <SelectItem value="warning">Warning (Amber)</SelectItem>
                    <SelectItem value="critical">Critical (Red)</SelectItem>
                    <SelectItem value="success">Success (Green)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Message Content</label>
              <Textarea 
                required
                placeholder="Details about the announcement..."
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
                className="bg-black/20 border-white/10 rounded-xl min-h-[100px]"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">📅 Schedule Publish (Optional)</label>
                <Input 
                  type="datetime-local"
                  value={formData.publish_at}
                  onChange={e => setFormData({...formData, publish_at: e.target.value})}
                  className="bg-black/20 border-white/10 rounded-xl"
                />
                <p className="text-[9px] text-muted-foreground ml-1">Leave empty to publish immediately.</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">⏰ Auto-Expire (Optional)</label>
                <Input 
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={e => setFormData({...formData, expires_at: e.target.value})}
                  className="bg-black/20 border-white/10 rounded-xl"
                />
                <p className="text-[9px] text-muted-foreground ml-1">The broadcast auto-hides after this date.</p>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={processing === "create"}
              className="w-full bg-primary text-primary-foreground font-bold h-11 rounded-xl"
            >
              {processing === "create" ? <Loader2 className="animate-spin" /> : (formData.publish_at && new Date(formData.publish_at) > new Date() ? "Schedule Broadcast" : "Blast to All Members")}
            </Button>
          </motion.form>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : announcements.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-[24px]">
                <p className="text-muted-foreground">No broadcast history found.</p>
              </div>
            ) : (
              announcements.map(a => (
                <div key={a.id} className="bg-card/50 border border-white/5 rounded-2xl p-5 flex items-start justify-between group">
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getTypeStyles(a.type)}`}>
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold">{a.title}</h4>
                        {!a.is_active && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Archived</span>
                        )}
                        {a.publish_at && new Date(a.publish_at) > new Date() && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">Scheduled</span>
                        )}
                        {a.expires_at && new Date(a.expires_at) < new Date() && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">Expired</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{a.content}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium flex-wrap">
                        <span className="flex items-center gap-1"><Clock size={12} /> {safeFormatDate(a.created_at, 'MMM d, h:mm a')}</span>
                        {a.publish_at && <span className="text-blue-500">Publishes: {safeFormatDate(a.publish_at, 'MMM d, h:mm a')}</span>}
                        {a.expires_at && <span className="text-amber-500">Expires: {safeFormatDate(a.expires_at, 'MMM d, h:mm a')}</span>}
                      </div>
                    </div>
                  </div>
                  {!readonly && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => toggleStatus(a.id, a.is_active)}
                      disabled={processing === a.id}
                      className={`p-2 rounded-lg transition-colors ${a.is_active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-white/10'}`}
                    >
                      {a.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button 
                      onClick={() => handleDelete(a.id)}
                      disabled={processing === a.id}
                      className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
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

export default BroadcastManager;
