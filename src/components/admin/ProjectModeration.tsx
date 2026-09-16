import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { ensureUrl } from "@/lib/utils-url";
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Loader2,
  Github,
  ExternalLink,
  Search,
  AlertCircle,
  Layout,
  Pause,
  Play,
  Trash2
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

const ProjectModeration = ({ readonly = false }: { readonly?: boolean }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState<{ [key: string]: string }>({});
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);


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
      toast.success(`Project ${status} successfully!`);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status, review_note: note } : p));
    } catch (error: any) {
      toast.error(`Failed to update project: ${error.message}`);
    }
    setProcessing(null);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure? This will remove the project permanently.")) return;

    setProcessing(projectId);
    try {
      await deleteDoc(doc(db, "projects", projectId));
      toast.success("Project removed");
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch {
      toast.error("Deletion failed");
    }
    setProcessing(null);
  };


  const pendingCount = projects.filter(p => p.status === 'pending').length;
  const filteredProjects = filter === 'pending' ? projects.filter(p => p.status === 'pending') : projects;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Layout size={20} className="text-primary" /> Project Moderation
          </h2>
          <p className="text-sm text-muted-foreground">{pendingCount} project{pendingCount !== 1 ? 's' : ''} awaiting action.</p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          <Button
            variant={filter === 'pending' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('pending')}
            className="rounded-lg h-8 text-[11px] font-bold uppercase tracking-wider"
          >
            Pending
          </Button>
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="rounded-lg h-8 text-[11px] font-bold uppercase tracking-wider"
          >
            All Projects
          </Button>
        </div>
      </div>


      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-20 border border-dashed rounded-[30px] border-white/10">
              <p className="text-muted-foreground text-sm">No projects found for current filter.</p>
            </div>
          ) : (
            filteredProjects.map((project) => (

              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`border rounded-[28px] p-6 lg:p-8 transition-all ${project.status === 'pending'
                    ? 'bg-card border-primary/20 shadow-2xl shadow-primary/5'
                    : 'bg-white/5 border-white/5 opacity-80'
                  }`}
              >
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${project.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                          project.status === 'paused' ? 'bg-amber-500/10 text-amber-500' :
                            project.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                              project.status === 'changes_requested' ? 'bg-amber-500/10 text-amber-500' :
                                'bg-blue-500/10 text-blue-500'
                        }`}>
                        {project.status.replace("_", " ")}
                      </span>

                      <span className="text-[10px] text-muted-foreground font-bold tracking-tight">By {project.author_name}</span>
                    </div>

                    <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                    <p className="text-muted-foreground text-xs mb-6 leading-relaxed line-clamp-2">
                      {project.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {project.stack?.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-medium text-muted-foreground">
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-4">
                      <a href={ensureUrl(project.github_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-bold hover:text-primary transition-colors">
                        <Github size={12} /> Repo
                      </a>
                      <a href={ensureUrl(project.live_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-bold hover:text-primary transition-colors">
                        <ExternalLink size={12} /> Live
                      </a>
                    </div>
                  </div>

                  {!readonly ? (
                    <div className="lg:w-72 flex flex-col gap-3 border-l border-white/5 lg:pl-8">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Admin Feedback</label>
                        <Textarea
                          placeholder="Notes for the author..."
                          className="bg-black/20 border-white/10 rounded-xl text-xs h-20 min-h-[80px]"
                          defaultValue={project.review_note}
                          onChange={(e) => setReviewNote(prev => ({ ...prev, [project.id]: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {project.status === 'draft' ? (
                          <Button
                            disabled
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-white/10 text-muted-foreground font-bold h-9 text-[11px] opacity-60 cursor-not-allowed"
                            title="Author has not submitted this draft yet"
                          >
                            <AlertCircle size={13} className="mr-1" /> Unsubmitted
                          </Button>
                        ) : project.status === 'approved' ? (
                          <Button
                            onClick={() => handleUpdateStatus(project.id, 'paused')}
                            disabled={processing === project.id}
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-amber-500/20 text-amber-500 font-bold h-9 text-xs"
                          >
                            <Pause size={14} className="mr-1.5" /> Pause
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleUpdateStatus(project.id, 'approved')}
                            disabled={processing === project.id}
                            size="sm"
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 text-xs"
                          >
                            {processing === project.id ? <Loader2 className="animate-spin w-3 h-3" /> : (project.status === 'paused' ? <Play size={14} className="mr-1.5" /> : <CheckCircle size={14} className="mr-1.5" />)}
                            {project.status === 'paused' ? 'Resume' : 'Approve'}
                          </Button>
                        )}
                        <Button
                          onClick={() => handleUpdateStatus(project.id, 'changes_requested')}
                          disabled={processing === project.id || project.status === 'draft'}
                          variant="outline"
                          size="sm"
                          className="rounded-xl bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 text-amber-500 font-bold h-9 text-xs disabled:opacity-40"
                        >
                          <MessageSquare size={14} className="mr-1.5" /> Note
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateStatus(project.id, 'rejected')}
                          disabled={processing === project.id || project.status === 'rejected'}
                          variant="ghost"
                          size="sm"
                          className="flex-1 rounded-xl text-destructive hover:bg-destructive/10 font-bold h-9 text-xs"
                        >
                          <XCircle size={14} className="mr-1.5" /> Reject
                        </Button>
                        <Button
                          onClick={() => handleDeleteProject(project.id)}
                          disabled={processing === project.id}
                          variant="ghost"
                          size="sm"
                          className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="lg:w-48 border-l border-white/5 lg:pl-8 flex items-start">
                      {project.review_note && (
                        <p className="text-xs text-muted-foreground italic">"{project.review_note}"</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProjectModeration;
