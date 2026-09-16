import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import {
  FileText, Plus, Trash2, Loader2, Edit3, Eye, EyeOff,
  Clock, CheckCircle2, X, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { safeFormatDate } from "@/lib/utils";
import { format } from "date-fns";
import { logAdminAction } from "./AuditLog";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author_name: string;
  is_published: boolean;
  published_at: string;
}

const emptyForm = {
  title: "",
  excerpt: "",
  content: "",
  category: "Announcement",
  author_name: "",
  is_published: true,
};

const CATEGORIES = ["Announcement", "Tutorial", "Event Recap", "Community", "Tech Insight", "Opinion"];

const BlogManager = ({ readonly = false }: { readonly?: boolean }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "blog_posts"), orderBy("published_at", "desc"));
      const snapshot = await getDocs(q);
      setPosts(snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        published_at: d.data().published_at?.toDate?.()?.toISOString() || d.data().published_at || new Date().toISOString()
      })) as BlogPost[]);
    } catch (err: any) {
      toast.error(`Failed to load blog posts: ${err.message}`);
    }
    setLoading(false);
  };

  const startEdit = (p: BlogPost) => {
    setEditing(p.id);
    setCreating(false);
    setForm({
      title: p.title || "",
      excerpt: p.excerpt || "",
      content: p.content || "",
      category: p.category || "Announcement",
      author_name: p.author_name || "",
      is_published: p.is_published ?? true,
    });
  };

  const cancel = () => { setEditing(null); setCreating(false); setForm(emptyForm); };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);

    try {
      const saveData = {
        ...form,
        published_at: form.is_published ? new Date().toISOString() : null,
      };

      if (editing) {
        await updateDoc(doc(db, "blog_posts", editing), saveData);
      } else {
        await addDoc(collection(db, "blog_posts"), {
          ...saveData,
          created_at: serverTimestamp(),
        });
      }

      toast.success(editing ? "Post updated" : "Post published!");
      await logAdminAction({
        actionType: editing ? "UPDATE" : "CREATE",
        targetType: "BLOG",
        targetId: editing || "",
        targetLabel: form.title,
        details: `${form.is_published ? "Published" : "Saved as draft"} in ${form.category}`,
      });
      cancel();
      fetchPosts();
    } catch (err: any) {
      toast.error(err.message || "Failed to save post");
    }
    setSaving(false);
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      await updateDoc(doc(db, "blog_posts", post.id), {
        is_published: !post.is_published,
        published_at: !post.is_published ? new Date().toISOString() : post.published_at
      });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_published: !p.is_published } : p));
      toast.success(post.is_published ? "Unpublished" : "Published!");
    } catch (err: any) {
      toast.error("Failed to update post");
    }
  };

  const remove = async (post: BlogPost) => {
    if (!confirm("Delete this blog post permanently?")) return;
    try {
      await deleteDoc(doc(db, "blog_posts", post.id));
      setPosts(prev => prev.filter(p => p.id !== post.id));
      toast.success("Post deleted");
      await logAdminAction({
        actionType: "DELETE",
        targetType: "BLOG",
        targetId: post.id,
        targetLabel: post.title,
        details: "Blog post permanently removed",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete post");
    }
  };

  const showForm = creating || editing !== null;
  const filteredPosts = filter === "all" ? posts :
    filter === "published" ? posts.filter(p => p.is_published) :
    posts.filter(p => !p.is_published);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText size={20} className="text-primary" /> Blog Manager
          </h2>
          <p className="text-sm text-muted-foreground">
            Create and manage blog posts. {posts.filter(p => p.is_published).length} published, {posts.filter(p => !p.is_published).length} drafts.
          </p>
        </div>
        {!showForm && !readonly && (
          <Button onClick={() => { setCreating(true); setForm(emptyForm); }} className="gap-2">
            <Plus size={16} /> New Post
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border border-white/10 rounded-[24px] p-6 bg-card space-y-4 shadow-2xl shadow-primary/5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editing ? "Edit Post" : "Create Post"}</h3>
            <button onClick={cancel} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Title</label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="bg-black/20 border-white/10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Category</label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-black/20 border-white/10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Author Name</label>
              <Input value={form.author_name} onChange={e => setForm({ ...form, author_name: e.target.value })} placeholder="e.g. Souvik Kundu" className="bg-black/20 border-white/10 rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Excerpt (Short Summary)</label>
            <Textarea value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} className="bg-black/20 border-white/10 rounded-xl min-h-[60px]" placeholder="A brief summary shown in the blog list..." />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Content</label>
            <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="bg-black/20 border-white/10 rounded-xl min-h-[200px]" placeholder="Write your full blog post content here..." />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-accent">
            <Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} />
            <Label className="text-sm">{form.is_published ? "Publish immediately" : "Save as draft"}</Label>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <Button onClick={save} disabled={saving} className="flex-1 gap-2 rounded-xl">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Update Post" : form.is_published ? "Publish Post" : "Save Draft"}
            </Button>
            <Button variant="outline" onClick={cancel} className="rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {!showForm && (
        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
          {(["all", "published", "draft"] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(f)}
              className="rounded-lg h-8 text-[11px] font-bold uppercase tracking-wider"
            >
              {f === "all" ? `All (${posts.length})` : f === "published" ? `Published (${posts.filter(p => p.is_published).length})` : `Drafts (${posts.filter(p => !p.is_published).length})`}
            </Button>
          ))}
        </div>
      )}

      {/* Posts List */}
      {!showForm && (
        loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filteredPosts.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-[24px] py-20 text-center text-sm text-muted-foreground">No posts found.</div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map(post => (
              <div key={post.id} className="bg-card/50 border border-white/5 rounded-2xl p-5 flex items-start justify-between group hover:border-primary/20 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary">{post.category}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${post.is_published ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                      {post.is_published ? "Published" : "Draft"}
                    </span>
                    {post.author_name && (
                      <span className="text-[10px] text-muted-foreground">by {post.author_name}</span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm mb-1">{post.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">{post.excerpt}</p>
                  {post.published_at && (
                    <span className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                      <Calendar size={10} /> {safeFormatDate(post.published_at, "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                {!readonly && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                  <button onClick={() => togglePublish(post)} className={`p-2 rounded-lg transition-colors ${post.is_published ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`}>
                    {post.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button onClick={() => startEdit(post)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => remove(post)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default BlogManager;
