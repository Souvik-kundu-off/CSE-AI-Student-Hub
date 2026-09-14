import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, increment } from "firebase/firestore";
import { ensureUrl } from "@/lib/utils-url";
import { useAuth } from "@/contexts/AuthContext";
import PageLayout from "@/components/PageLayout";
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Loader2, 
  Github, 
  ExternalLink,
  ShieldCheck,
  Search,
  ChevronDown,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Project {
  id: string;
  title: string;
  description: string;
  stack: string[];
  author_id: string;
  author_name: string;
  github_url: string;
  live_url: string;
  status: string;
  review_note: string;
  created_at: string;
}

const AdminReview = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reviewNote, setReviewNote] = useState<{ [key: string]: string }>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || profile?.role !== "admin") {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setIsAdmin(true);
    fetchProjects();
  }, [user, profile, authLoading]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "projects"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    } catch {
      toast.error("Failed to fetch projects");
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (projectId: string, status: string) => {
    setProcessing(projectId);
    const note = reviewNote[projectId] || "";

    try {
      await updateDoc(doc(db, "projects", projectId), { status, review_note: note });

      if (status === 'approved') {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          // Award points
          const profileRef = doc(db, "profiles", project.author_id);
          const profileSnap = await getDoc(profileRef);
          const currentPoints = profileSnap.exists() ? (profileSnap.data().points || 0) : 0;
          const pointsToAward = 50;

          await updateDoc(profileRef, { points: currentPoints + pointsToAward });

          await addDoc(collection(db, "points_history"), {
            user_id: project.author_id,
            amount: pointsToAward,
            description: `Project Approval: ${project.title} (${project.id.substring(0, 8)})`,
            created_at: serverTimestamp(),
          });

          toast.success(`Project approved! +${pointsToAward} points awarded to ${project.author_name}.`);
        }
      } else {
        toast.success(`Project ${status.replace("_", " ")} successfully!`);
      }
      fetchProjects();
    } catch (error: any) {
      toast.error(`Failed to update project: ${error.message}`);
    }
    setProcessing(null);
  };

  if (isAdmin === false) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-40">
          <AlertCircle size={48} className="text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
          <p className="text-muted-foreground">This area is for Department Staff only.</p>
        </div>
      </PageLayout>
    );
  }

  const pendingCount = projects.filter(p => p.status === 'pending').length;

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary mb-4">
              <ShieldCheck size={12} />
              Admin Command
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Project Review Panel</h1>
            <p className="text-muted-foreground">
              You have {pendingCount} project{pendingCount !== 1 ? 's' : ''} awaiting approval.
            </p>
          </div>
          <Button variant="outline" onClick={fetchProjects} className="rounded-xl">
            Refresh Queue
          </Button>
        </header>

        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-20 border border-dashed rounded-[30px] border-white/10">
                <p className="text-muted-foreground">The queue is empty.</p>
              </div>
            ) : (
              projects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`border rounded-[32px] p-8 transition-all ${
                    project.status === 'pending' 
                      ? 'bg-card border-white/10 shadow-2xl shadow-primary/5' 
                      : 'bg-white/5 border-white/5 opacity-80'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          project.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                          project.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                          project.status === 'changes_requested' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {project.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">By {project.author_name}</span>
                      </div>
                      
                      <h3 className="text-2xl font-bold mb-3">{project.title}</h3>
                      <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                        {project.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-6">
                        {project.stack?.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium">
                            {s}
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-4">
                        <a href={ensureUrl(project.github_url)} target="_blank" className="flex items-center gap-2 text-xs font-bold hover:text-primary transition-colors">
                          <Github size={14} /> Repository
                        </a>
                        <a href={ensureUrl(project.live_url)} target="_blank" className="flex items-center gap-2 text-xs font-bold hover:text-primary transition-colors">
                          <ExternalLink size={14} /> Live View
                        </a>
                      </div>
                    </div>

                    <div className="lg:w-80 flex flex-col gap-4 border-l border-white/5 lg:pl-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Admin Feedback</label>
                        <Textarea 
                          placeholder="Add a note (e.g. 'Deploy link broken')"
                          className="bg-black/20 border-white/10 rounded-2xl text-xs h-24 focus-visible:ring-primary min-h-[100px]"
                          defaultValue={project.review_note}
                          onChange={(e) => setReviewNote(prev => ({ ...prev, [project.id]: e.target.value }))}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <Button 
                          onClick={() => handleUpdateStatus(project.id, 'approved')}
                          disabled={processing === project.id || project.status === 'approved'}
                          className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11"
                        >
                          {processing === project.id ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle size={16} className="mr-2" /> Approve</>}
                        </Button>
                        <Button 
                          onClick={() => handleUpdateStatus(project.id, 'changes_requested')}
                          disabled={processing === project.id}
                          variant="outline"
                          className="rounded-xl bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 text-amber-500 font-bold h-11"
                        >
                          <MessageSquare size={16} className="mr-2" /> Note
                        </Button>
                      </div>
                      <Button 
                        onClick={() => handleUpdateStatus(project.id, 'rejected')}
                        disabled={processing === project.id}
                        variant="ghost"
                        className="rounded-xl text-destructive hover:bg-destructive/10 font-bold h-11"
                      >
                        <XCircle size={16} className="mr-2" /> Reject
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminReview;
