import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { ensureUrl } from "@/lib/utils-url";
import { useAuth } from "@/contexts/AuthContext";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { getYouTubeEmbedUrl } from "@/lib/youtube-utils";
import {
  Github, ExternalLink, Loader2, ArrowLeft, Users, Tag,
  Calendar, CheckCircle2, Clock, AlertCircle, FileEdit,
  MessageSquare, RefreshCw, Eye, Heart, ChevronLeft, ChevronRight,
  Video, Image as ImageIcon, Maximize2, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { safeFormatDate } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
  description: string;
  stack: string[];
  tags: string[];
  team_members: string[];
  images: string[];
  author_id: string;
  author_name: string;
  category: string;
  status: string;
  review_note: string | null;
  github_url: string | null;
  live_url: string | null;
  youtube_url: string | null;
  views_count: number | null;
  likes_count: number | null;
  created_at: string;
}

const statusMeta: Record<string, { label: string; cls: string; icon: any }> = {
  draft:             { label: "Draft",             cls: "bg-muted text-muted-foreground",      icon: FileEdit },
  pending:           { label: "Pending Review",    cls: "bg-blue-500/10 text-blue-500",        icon: Clock },
  approved:          { label: "Approved",          cls: "bg-emerald-500/10 text-emerald-500",  icon: CheckCircle2 },
  rejected:          { label: "Rejected",          cls: "bg-destructive/10 text-destructive",  icon: AlertCircle },
  changes_requested: { label: "Changes Requested", cls: "bg-amber-500/10 text-amber-500",      icon: AlertCircle },
  paused:            { label: "Paused",            cls: "bg-amber-500/10 text-amber-500",      icon: Clock },
};

const noteStyle: Record<string, string> = {
  rejected:          "bg-destructive/5 border-destructive/20 text-destructive",
  changes_requested: "bg-amber-500/5 border-amber-500/20 text-amber-500",
  approved:          "bg-emerald-500/5 border-emerald-500/20 text-emerald-600",
  default:           "bg-blue-500/5 border-blue-500/20 text-blue-500",
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [resubmitting, setResubmitting] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<"video" | "images">("video");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Initial load
    (async () => {
      setLoading(true);
      const docRef = doc(db, "projects", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        toast.error("Project not found");
        navigate("/projects");
        return;
      }
      const data = { id: docSnap.id, ...docSnap.data() } as Project;
      setProject(data);
      setLoading(false);

      // Increment view count (fire-and-forget)
      updateDoc(docRef, { views_count: increment(1) }).catch(() => {});
    })();
  }, [id]);

  const resubmit = async () => {
    if (!project) return;
    setResubmitting(true);
    try {
      await updateDoc(doc(db, "projects", project.id), { status: "pending" });
      toast.success("Project resubmitted for review!");
      setProject({ ...project, status: "pending" });
    } catch (error: any) {
      toast.error("Failed to resubmit: " + error.message);
    }
    setResubmitting(false);
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center py-40">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!project) return null;

  const meta = statusMeta[project.status] || statusMeta.draft;
  const StatusIcon = meta.icon;
  const images = project.images || [];
  const isOwner = (user?.uid || (user as any)?.id) === project.author_id;
  const canResubmit = isOwner && project.status === "changes_requested";
  const ns = noteStyle[project.status] || noteStyle.default;

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-5xl">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {project.category && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {project.category}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.cls}`}>
                <StatusIcon size={11} /> {meta.label}
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar size={11} /> {safeFormatDate(project.created_at, "MMMM d, yyyy")}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">{project.title}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Users size={13} /> by <span className="font-medium text-foreground">{project.author_name || "Anonymous"}</span>
            </p>

            {(project.views_count || project.likes_count) ? (
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {project.views_count ? <span className="flex items-center gap-1"><Eye size={12} /> {project.views_count} views</span> : null}
                {project.likes_count ? <span className="flex items-center gap-1"><Heart size={12} /> {project.likes_count} likes</span> : null}
              </div>
            ) : null}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {project.github_url && (
              <a href={ensureUrl(project.github_url)} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="gap-2 rounded-xl h-9">
                  <Github size={14} /> Repository
                </Button>
              </a>
            )}
            {project.live_url && (
              <a href={ensureUrl(project.live_url)} target="_blank" rel="noreferrer">
                <Button size="sm" className="gap-2 rounded-xl h-9">
                  <ExternalLink size={14} /> Live Demo
                </Button>
              </a>
            )}
            {isOwner && (
              <Link to={`/submit-project/${project.id}`}>
                <Button variant="ghost" size="sm" className="gap-2 rounded-xl h-9">
                  <FileEdit size={14} /> Edit
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Admin Feedback Banner */}
        {project.review_note && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-2xl border ${ns}`}
          >
            <div className="flex items-start gap-3">
              <MessageSquare size={16} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-sm mb-1">Admin Feedback</p>
                <p className="text-sm leading-relaxed">{project.review_note}</p>
              </div>
              {canResubmit && (
                <Button
                  onClick={resubmit}
                  disabled={resubmitting}
                  size="sm"
                  className="gap-2 rounded-xl shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-bold"
                >
                  {resubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw size={13} />}
                  Resubmit
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Resubmit CTA (even without a note) */}
        {canResubmit && !project.review_note && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-3">
            <p className="text-sm text-amber-500 font-medium">
              This project needs changes. Make your edits then resubmit for review.
            </p>
            <Button
              onClick={resubmit}
              disabled={resubmitting}
              size="sm"
              className="gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shrink-0"
            >
              {resubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw size={13} />}
              Resubmit for Review
            </Button>
          </div>
        )}

        {/* Hero Media Container (Video Demo + Screenshots) */}
        {(() => {
          const youtubeEmbedUrl = getYouTubeEmbedUrl(project.youtube_url);
          const hasVideo = !!youtubeEmbedUrl;
          const hasImages = images.length > 0;

          if (!hasVideo && !hasImages) return null;

          // Automatically default to video if available and images exist
          const showVideo = hasVideo && (activeMediaTab === "video" || !hasImages);

          return (
            <div className="mb-8 relative">
              {/* Media Switcher Tabs (if both video and screenshots exist) */}
              {hasVideo && hasImages && (
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab("video")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      showVideo
                        ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                        : "bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" /> Video Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab("images")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      !showVideo
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Screenshots ({images.length})
                  </button>
                </div>
              )}

              {/* Video Embed Player */}
              {showVideo ? (
                <div className="relative aspect-video w-full rounded-xl sm:rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl">
                  <iframe
                    src={youtubeEmbedUrl!}
                    title={`${project.title} Video Demo`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                /* Screenshots Carousel */
                images.length > 0 && (
                  <>
                    <div 
                      onClick={() => setLightboxOpen(true)}
                      className="relative aspect-[4/3] sm:aspect-video w-full rounded-xl sm:rounded-2xl overflow-hidden bg-accent border border-white/5 cursor-pointer group"
                    >
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={imgIdx}
                          src={images[imgIdx]}
                          alt={`${project.title} screenshot ${imgIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          initial={{ opacity: 0, scale: 1.02 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        />
                      </AnimatePresence>

                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 pointer-events-none">
                        <Maximize2 size={12} /> Click to expand
                      </div>

                      {/* Nav arrows */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                          >
                            <ChevronRight size={18} />
                          </button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {images.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setImgIdx(i)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? "bg-white w-4" : "bg-white/40"}`}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {/* Image count badge */}
                      {images.length > 1 && (
                        <span className="absolute top-3 right-3 text-[10px] font-bold bg-black/60 backdrop-blur text-white px-2 py-1 rounded-full">
                          {imgIdx + 1} / {images.length}
                        </span>
                      )}
                    </div>

                    {/* Thumbnail strip */}
                    {images.length > 1 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                        {images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setImgIdx(i)}
                            className={`relative aspect-video w-20 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                              i === imgIdx ? "border-primary shadow-md scale-105" : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          );
        })()}

        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Description */}
          <div className="md:col-span-2 space-y-6">
            <div className="border border-border rounded-2xl p-6 bg-card">
              <h2 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-4">About this Project</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden">{project.description}</p>
            </div>

            {/* Team Members */}
            {project.team_members?.length > 0 && (
              <div className="border border-border rounded-2xl p-6 bg-card">
                <h2 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                  <Users size={14} /> Team
                </h2>
                <div className="flex flex-wrap gap-2">
                  {project.team_members.map((m, i) => (
                    <span key={i} className="px-3 py-1 bg-accent rounded-full text-sm font-medium">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Tech Stack */}
            {project.stack?.length > 0 && (
              <div className="border border-border rounded-2xl p-5 bg-card">
                <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3">Tech Stack</h3>
                <div className="flex flex-wrap gap-1.5">
                  {project.stack.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-lg border border-primary/20">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {project.tags?.length > 0 && (
              <div className="border border-border rounded-2xl p-5 bg-card">
                <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Tag size={11} /> Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 bg-accent text-muted-foreground text-xs rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="border border-border rounded-2xl p-5 bg-card space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3">Links</h3>
              {project.github_url ? (
                <a href={ensureUrl(project.github_url)} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                  <Github size={14} /> View Repository
                </a>
              ) : (
                <p className="text-xs text-muted-foreground italic">No GitHub link</p>
              )}
              {project.live_url ? (
                <a href={ensureUrl(project.live_url)} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                  <ExternalLink size={14} /> Live Demo
                </a>
              ) : (
                <p className="text-xs text-muted-foreground italic">No live demo</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && images[imgIdx] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Close image"
            >
              <X size={20} />
            </button>

            <img
              src={images[imgIdx]}
              alt={`${project.title} screenshot HD`}
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
};

export default ProjectDetail;
