import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  MapPin,
  Clock,
  ExternalLink,
  Loader2,
  Building2,
  GraduationCap,
  IndianRupee,
  ArrowLeft,
  CheckCircle2,
  FileText,
  AlertCircle,
  Share2,
  Download,
  Code2,
  Layers,
  Award,
} from "lucide-react";
import { motion } from "framer-motion";
import { JobPosting } from "@/types/job";
import { safeFormatDate } from "@/lib/utils";
import { ensureUrl } from "@/lib/utils-url";
import { toast } from "sonner";
import { stripMarkdown } from "@/lib/ai-job-parser";

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "job_postings", id));
        if (snap.exists()) {
          setJob({ id: snap.id, ...snap.data() } as JobPosting);
        } else {
          toast.error("Job posting not found");
          navigate("/jobs");
        }
      } catch (err) {
        toast.error("Failed to load job posting");
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${job?.company} - ${job?.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Job link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center py-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!job) return null;

  return (
    <PageLayout>
      <div className="min-h-screen pb-24">
        {/* Top Header Navigation */}
        <div className="container mx-auto px-4 max-w-5xl pt-24 pb-6">
          <button
            onClick={() => navigate("/jobs")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={14} /> Back to Job Board
          </button>

          {/* Hero Banner */}
          <div className="bg-card border border-border/80 rounded-[32px] p-6 sm:p-10 shadow-sm relative overflow-hidden">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-black text-2xl overflow-hidden shadow-inner">
                  {job.company_logo ? (
                    <img src={job.company_logo} alt={job.company} className="w-full h-full object-cover" />
                  ) : (
                    job.company.substring(0, 2).toUpperCase()
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-bold text-sm text-foreground flex items-center gap-1">
                      <Building2 size={14} className="text-primary" /> {job.company}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin size={12} /> {job.location || "Pan-India"}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-4">
                    {job.title}
                  </h1>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                      job.job_type === "Internship"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                      {job.job_type}
                    </span>

                    {job.ctc_package && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                        <IndianRupee size={13} /> {job.ctc_package}
                      </span>
                    )}

                    {job.deadline && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                        <Clock size={13} /> Deadline: {job.deadline}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                {job.apply_url ? (
                  <a href={ensureUrl(job.apply_url)} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button className="w-full h-12 rounded-2xl gap-2 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 text-sm">
                      Apply via Placement Form <ExternalLink size={16} />
                    </Button>
                  </a>
                ) : (
                  <Button disabled className="w-full h-12 rounded-2xl gap-2 font-bold text-sm opacity-60">
                    Application Closed
                  </Button>
                )}

                <Button variant="outline" onClick={handleShare} className="h-10 rounded-2xl gap-2 text-xs font-semibold">
                  <Share2 size={14} /> Share Job
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-[1fr_320px] gap-8">
            {/* Left Main Section */}
            <div className="space-y-8">
              {/* Detailed Description */}
              <div className="bg-card border border-border/60 rounded-[28px] p-6 sm:p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b border-border/50 pb-4">
                  <FileText size={18} className="text-primary" /> Role Description & Overview
                </h3>

                <div className="prose prose-invert max-w-none text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {stripMarkdown(job.description)}
                </div>
              </div>

              {/* Selection Process */}
              {job.selection_process && job.selection_process.length > 0 && (
                <div className="bg-card border border-border/60 rounded-[28px] p-6 sm:p-8 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 border-b border-border/50 pb-4">
                    <Layers size={18} className="text-primary" /> Selection & Assessment Process
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {job.selection_process.map((step, index) => (
                      <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-xs font-semibold leading-snug self-center">{stripMarkdown(step)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Eligibility Criteria Matrix */}
              <div className="bg-card border border-border/60 rounded-[28px] p-6 shadow-sm space-y-5">
                <h3 className="text-base font-bold flex items-center gap-2 border-b border-border/50 pb-3">
                  <GraduationCap size={18} className="text-primary" /> Eligibility Criteria
                </h3>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Eligible Batches</label>
                    <div className="flex flex-wrap gap-1.5">
                      {job.eligible_batches && job.eligible_batches.length > 0 ? (
                        job.eligible_batches.map(b => (
                          <span key={b} className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold">
                            Batch {b}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground font-medium">All Graduating Batches</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Programmes / Streams</label>
                    <div className="flex flex-wrap gap-1.5">
                      {job.eligible_programmes && job.eligible_programmes.length > 0 ? (
                        job.eligible_programmes.map(p => (
                          <span key={p} className="px-2.5 py-1 rounded-lg bg-accent text-muted-foreground font-medium">
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground font-medium">CSE / AI / IT / Allied Branches</span>
                      )}
                    </div>
                  </div>

                  {job.min_cgpa && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Minimum CGPA</label>
                      <span className="text-sm font-bold text-emerald-400">{job.min_cgpa} CGPA & Above</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Skills */}
              {job.key_skills && job.key_skills.length > 0 && (
                <div className="bg-card border border-border/60 rounded-[28px] p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold flex items-center gap-2 border-b border-border/50 pb-3">
                    <Code2 size={16} className="text-primary" /> Key Skills Required
                  </h3>

                  <div className="flex flex-wrap gap-1.5">
                    {job.key_skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Placement PDF */}
              {job.pdf_url && (
                <div className="bg-card border border-border/60 rounded-[28px] p-6 shadow-sm space-y-3">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <FileText size={16} className="text-primary" /> Official Placement PDF
                  </h3>
                  <p className="text-xs text-muted-foreground">Download the original job description PDF document sent by placement cell.</p>
                  <a href={ensureUrl(job.pdf_url)} target="_blank" rel="noopener noreferrer" className="block w-full">
                    <Button variant="outline" className="w-full gap-2 rounded-xl text-xs font-semibold">
                      <Download size={14} /> Download Placement PDF
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default JobDetail;
