import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  parseJobPostingWithAI,
  getGroqApiKey,
  setLocalGroqApiKey,
  stripMarkdown,
} from "@/lib/ai-job-parser";
import { extractFileText } from "@/lib/pdf-extract";
import { JobPosting, JobType, JobStatus, AIJobParseResult } from "@/types/job";
import { useAuth } from "@/contexts/AuthContext";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Briefcase,
  Plus,
  Wand2,
  Loader2,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Search,
  Upload,
  IndianRupee,
  MapPin,
  X,
  ArrowLeft,
  FileText,
  Mail,
  GraduationCap,
  Send,
  BookOpen,
  ListChecks,
  Link2,
  CalendarDays,
  ShieldCheck,
  Info,
  AlertCircle,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────
type FormData = {
  title: string;
  company: string;
  location: string;
  job_type: JobType;
  ctc_package: string;
  eligible_batches: string;
  eligible_programmes: string;
  min_cgpa: string;
  description: string;
  key_skills: string;
  selection_process: string;
  apply_url: string;
  pdf_url: string;
  deadline: string;
  status: JobStatus;
};

const EMPTY_FORM: FormData = {
  title: "",
  company: "",
  location: "Kolkata / Hybrid",
  job_type: "Full-time",
  ctc_package: "",
  eligible_batches: "2025, 2026",
  eligible_programmes: "B.Tech CSE, B.Tech AI, BCA, MCA",
  min_cgpa: "",
  description: "",
  key_skills: "",
  selection_process: "Online Assessment, Technical Interview, HR Round",
  apply_url: "",
  pdf_url: "",
  deadline: "",
  status: "active",
};

// ── AdminJobs ─────────────────────────────────────────────────────────
const AdminJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal states: "none" | "ai-input" | "preview" | "form"
  const [modal, setModal] = useState<"none" | "ai-input" | "preview" | "form">("none");
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // AI Importer state
  const [aiRawText, setAiRawText] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Unified form data (used for both preview-edit and manual form)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [parseMeta, setParseMeta] = useState<AIJobParseResult["_meta"]>(undefined);

  // Groq API Key state (detects env or saved browser key)
  const hasEnvKey = Boolean(
    (import.meta.env.VITE_GROQ_API_KEY as string) ||
    (import.meta.env.VITE_GEOQ_API_KEY as string)
  );
  const [localApiKey, setLocalApiKey] = useState(() => getGroqApiKey());

  useEffect(() => { fetchJobs(); }, []);

  // ── Data ────────────────────────────────────────────────────────────
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "job_postings")));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting));
      setJobs(list);
    } catch {
      toast.error("Failed to fetch jobs");
    }
    setLoading(false);
  };

  // ── AI Extract ──────────────────────────────────────────────────────
  const handleAiExtract = async () => {
    if (!aiRawText.trim() && !aiFile) {
      toast.error("Please paste email text or select a file (PDF / TXT)");
      return;
    }

    setIsExtracting(true);
    try {
      let combinedText = aiRawText.trim();

      // 1️⃣ Extract text from the uploaded file (local only — file is NOT uploaded to storage)
      if (aiFile) {
        toast.info(`Reading ${aiFile.name}...`);
        const fileText = await extractFileText(aiFile);
        combinedText = [combinedText, fileText].filter(Boolean).join("\n\n---\n\n");
      }

      if (!combinedText.trim()) {
        toast.error("Could not extract any text from the file. Please paste the content manually.");
        setIsExtracting(false);
        return;
      }

      // 2️⃣ Call Groq AI / Smart Parser
      toast.info("Analysing placement details...");
      const result: AIJobParseResult = await parseJobPostingWithAI(combinedText);

      // 3️⃣ Populate form and show preview (only structured text data is kept — no file reference)
      setParseMeta(result._meta);
      setFormData({
        title: result.title,
        company: result.company,
        location: result.location,
        job_type: result.job_type,
        ctc_package: result.ctc_package,
        eligible_batches: result.eligible_batches.join(", "),
        eligible_programmes: result.eligible_programmes.join(", "),
        min_cgpa: result.min_cgpa ? String(result.min_cgpa) : "",
        description: result.description,
        key_skills: result.key_skills.join(", "),
        selection_process: result.selection_process.join(", "),
        apply_url: result.apply_url,
        pdf_url: "",
        deadline: result.deadline,
        status: "active",
      });

      setModal("preview");
      if (result._meta?.source === "ai") {
        toast.success(`Extracted using AI (${result._meta.model})! Please verify details.`);
      } else {
        toast.info(
          result._meta?.warning
            ? `Extracted using smart parser: ${result._meta.warning}`
            : "Extracted using smart parser. Please verify details before posting.",
          { duration: 6000 }
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Extraction failed. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Save / Publish ──────────────────────────────────────────────────
  const handleSaveJob = async (status: JobStatus = formData.status) => {
    if (!formData.title.trim() || !formData.company.trim()) {
      toast.error("Job title and company are required");
      return;
    }

    setSaving(true);
    const payload = {
      title: formData.title.trim(),
      company: formData.company.trim(),
      location: formData.location.trim() || "Kolkata / Hybrid",
      job_type: formData.job_type,
      ctc_package: formData.ctc_package.trim() || null,
      eligible_batches: formData.eligible_batches.split(",").map(b => b.trim()).filter(Boolean),
      eligible_programmes: formData.eligible_programmes.split(",").map(p => p.trim()).filter(Boolean),
      min_cgpa: formData.min_cgpa ? parseFloat(formData.min_cgpa) : null,
      description: formData.description.trim(),
      key_skills: formData.key_skills.split(",").map(s => s.trim()).filter(Boolean),
      selection_process: formData.selection_process.split(",").map(s => s.trim()).filter(Boolean),
      apply_url: formData.apply_url.trim(),
      pdf_url: formData.pdf_url.trim() || null,
      deadline: formData.deadline.trim() || null,
      status,
      created_by: user?.uid || null,
      updated_at: serverTimestamp(),
    };

    try {
      if (editingJobId) {
        await updateDoc(doc(db, "job_postings", editingJobId), payload);
        toast.success("Job posting updated!");
      } else {
        await addDoc(collection(db, "job_postings"), {
          ...payload,
          created_at: serverTimestamp(),
        });
        toast.success(status === "active" ? "Job posted successfully! 🎉" : "Saved as draft.");
      }
      setModal("none");
      setEditingJobId(null);
      setFormData(EMPTY_FORM);
      fetchJobs();
    } catch (err: any) {
      toast.error(err.message || "Failed to save job posting");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────
  const handleEdit = (job: JobPosting) => {
    setEditingJobId(job.id);
    setFormData({
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      job_type: job.job_type || "Full-time",
      ctc_package: job.ctc_package || "",
      eligible_batches: job.eligible_batches?.join(", ") || "",
      eligible_programmes: job.eligible_programmes?.join(", ") || "",
      min_cgpa: job.min_cgpa ? String(job.min_cgpa) : "",
      description: job.description || "",
      key_skills: job.key_skills?.join(", ") || "",
      selection_process: job.selection_process?.join(", ") || "",
      apply_url: job.apply_url || "",
      pdf_url: job.pdf_url || "",
      deadline: job.deadline || "",
      status: job.status || "active",
    });
    setModal("form");
  };

  const handleDelete = async (jobId: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, "job_postings", jobId));
      toast.success("Job posting deleted");
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleToggleStatus = async (job: JobPosting) => {
    const newStatus: JobStatus = job.status === "active" ? "closed" : "active";
    try {
      await updateDoc(doc(db, "job_postings", job.id), { status: newStatus });
      toast.success(`Job marked as ${newStatus}`);
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
    } catch {
      toast.error("Status update failed");
    }
  };

  const fd = (field: keyof FormData, val: string) =>
    setFormData(prev => ({ ...prev, [field]: val }));

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
              <Briefcase size={12} /> Placement Admin
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Job & Career Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Import placement emails/PDFs using AI, review, then publish to students.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setAiRawText(""); setAiFile(null); setModal("ai-input");
              }}
              className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
            >
              <Wand2 size={16} /> Import with AI
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingJobId(null); setFormData(EMPTY_FORM); setModal("form");
              }}
              className="gap-2 rounded-xl border-white/10"
            >
              <Plus size={16} /> Add Manually
            </Button>
          </div>
        </header>

        {/* Search */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search company or role..."
              className="pl-10 bg-card border-white/10 rounded-xl"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card/40 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="p-4">Company & Role</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">CTC / Package</th>
                  <th className="p-4">Batches</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={6} className="p-20 text-center"><Loader2 className="animate-spin inline text-primary w-6 h-6" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-20 text-center text-muted-foreground text-sm">
                    No job postings yet. Click <strong>Import with AI</strong> to add one.
                  </td></tr>
                ) : (
                  filtered.map(job => (
                    <tr key={job.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-bold">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.company}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">{job.job_type}</span>
                      </td>
                      <td className="p-4"><span className="text-xs font-bold text-emerald-400">{job.ctc_package || "N/A"}</span></td>
                      <td className="p-4"><span className="text-xs text-muted-foreground">{job.eligible_batches?.join(", ") || "All"}</span></td>
                      <td className="p-4">
                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                          job.status === "active"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : job.status === "draft"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-muted text-muted-foreground border border-white/10"
                        }`}>{job.status}</span>
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(job)} className="h-8 text-xs font-semibold">
                          {job.status === "active" ? "Close" : "Reopen"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(job)} className="h-8 text-xs text-primary">
                          <Edit3 size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(job.id, job.title)} className="h-8 text-xs text-destructive hover:bg-destructive/10">
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          STEP 1 — AI Importer Input Modal
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={modal === "ai-input"} onOpenChange={o => !o && setModal("none")}>
        <DialogContent className="max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Wand2 className="text-primary w-5 h-5" /> AI Placement Importer
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Paste the placement email text <strong>and / or</strong> upload the JD file (PDF, TXT).
              The AI will read everything and extract all key job details for your review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Text area */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail size={12} /> Paste Placement Email / Notice Text
              </Label>
              <Textarea
                placeholder="Paste the full placement email here, e.g.:&#10;&#10;'TCS is inviting applications from B.Tech CSE 2026 batch students for the role of Systems Engineer. CTC: 7 LPA. Last date: Oct 20, 2026. Apply at: forms.gle/xxxx'"
                className="bg-black/20 border-white/10 rounded-2xl text-xs h-40 min-h-[120px] resize-y"
                value={aiRawText}
                onChange={e => setAiRawText(e.target.value)}
              />
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText size={12} /> Upload JD Document (PDF, TXT, or any text file)
              </Label>
              <div className="relative flex items-center gap-3 p-4 bg-black/20 border border-dashed border-white/20 rounded-2xl group hover:border-primary/40 transition-colors">
                {aiFile ? (
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <FileText size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{aiFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(aiFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiFile(null)}
                      className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <input
                        type="file"
                        accept=".pdf,.txt,.md,.text"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={e => setAiFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        <span className="text-primary font-semibold">Click to browse</span> or drag & drop your JD file here
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">PDF, TXT, MD supported</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2.5 p-3 bg-primary/5 border border-primary/10 rounded-2xl">
              <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                You can provide <strong className="text-foreground">both</strong> the email text and a PDF — the AI will merge all sources, extract relevant job fields, and present them for your review before publishing.
              </p>
            </div>

            {/* Groq AI Engine Status & Key Override */}
            <div className="p-3.5 bg-white/[0.03] border border-border/60 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Key size={13} className="text-primary" /> Groq AI Engine
                </span>
                {hasEnvKey ? (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} /> Active (.env)
                  </span>
                ) : localApiKey ? (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} /> Active (Browser Key)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertCircle size={10} /> Smart Offline Fallback Mode
                  </span>
                )}
              </div>

              {!hasEnvKey && (
                <div className="space-y-1 pt-1">
                  <Input
                    type="password"
                    placeholder="Paste Groq API key (gsk_...) to activate AI extraction immediately"
                    value={localApiKey}
                    onChange={e => {
                      const val = e.target.value.trim();
                      setLocalApiKey(val);
                      setLocalGroqApiKey(val);
                    }}
                    className="bg-background/80 rounded-xl font-mono text-xs h-9"
                  />
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                    Vercel requires a <strong>Redeploy</strong> to bundle new environment variables into the site. If you added the key in Vercel settings and haven't redeployed yet, you can paste it above to use AI right away.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setModal("none")} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleAiExtract}
              disabled={isExtracting || (!aiRawText.trim() && !aiFile)}
              className="rounded-xl gap-2 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isExtracting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting...</>
                : <><Wand2 size={16} /> Extract & Preview</>
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          STEP 2 — AI Preview & Confirm Modal
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={modal === "preview"} onOpenChange={o => !o && setModal("none")}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-card p-0 shadow-2xl">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border/60 p-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    parseMeta?.source === "ai"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  }`}
                >
                  <ShieldCheck size={14} />
                </div>
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    parseMeta?.source === "ai" ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {parseMeta?.source === "ai"
                    ? `AI Extracted (${parseMeta.model}) — Verify Before Posting`
                    : "Extracted via Smart Parser — Verify Before Posting"}
                </span>
              </div>
              <h2 className="text-lg font-bold leading-tight">Review & Confirm Job Posting</h2>
              <p className="text-xs text-muted-foreground mt-0.5">All fields are editable. Correct anything the AI may have gotten wrong.</p>
              {parseMeta?.warning && (
                <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                  <AlertCircle size={12} className="shrink-0 text-amber-400" />
                  <span>{parseMeta.warning}</span>
                </div>
              )}
            </div>
            <button onClick={() => setModal("none")} className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* Role & Company */}
            <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Briefcase size={11} /> Role & Company
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Job Title *</Label>
                  <Input value={formData.title} onChange={e => fd("title", e.target.value)} placeholder="e.g. Software Engineer" className="bg-background/50 rounded-xl text-sm font-semibold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Company Name *</Label>
                  <Input value={formData.company} onChange={e => fd("company", e.target.value)} placeholder="e.g. TCS, Infosys" className="bg-background/50 rounded-xl text-sm font-semibold" />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Job Type</Label>
                  <Select value={formData.job_type} onValueChange={(v: JobType) => fd("job_type", v)}>
                    <SelectTrigger className="bg-background/50 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                      <SelectItem value="Co-op">Co-op</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><IndianRupee size={10} /> CTC / Stipend</Label>
                  <Input value={formData.ctc_package} onChange={e => fd("ctc_package", e.target.value)} placeholder="e.g. 6.5 LPA" className="bg-background/50 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><MapPin size={10} /> Location</Label>
                  <Input value={formData.location} onChange={e => fd("location", e.target.value)} placeholder="e.g. Kolkata / Hybrid" className="bg-background/50 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Eligibility */}
            <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <GraduationCap size={11} /> Eligibility Criteria
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Eligible Batches</Label>
                  <Input value={formData.eligible_batches} onChange={e => fd("eligible_batches", e.target.value)} placeholder="2025, 2026" className="bg-background/50 rounded-xl text-xs" />
                  <p className="text-[9px] text-muted-foreground/60">Comma separated</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Programmes</Label>
                  <Input value={formData.eligible_programmes} onChange={e => fd("eligible_programmes", e.target.value)} placeholder="B.Tech CSE, B.Tech AI" className="bg-background/50 rounded-xl text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Min CGPA</Label>
                  <Input type="number" step="0.1" min="0" max="10" value={formData.min_cgpa} onChange={e => fd("min_cgpa", e.target.value)} placeholder="e.g. 6.5" className="bg-background/50 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <BookOpen size={11} /> Job Description & Responsibilities
              </p>
              <Textarea
                value={formData.description}
                onChange={e => fd("description", e.target.value)}
                placeholder="Describe key responsibilities, requirements..."
                className="bg-background/50 rounded-xl h-36 text-sm resize-y"
              />
            </div>

            {/* Skills & Process */}
            <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <ListChecks size={11} /> Skills & Selection Process
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Key Skills Required</Label>
                  <Input value={formData.key_skills} onChange={e => fd("key_skills", e.target.value)} placeholder="React, Java, Python, SQL" className="bg-background/50 rounded-xl text-xs" />
                  <p className="text-[9px] text-muted-foreground/60">Comma separated</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Selection Rounds</Label>
                  <Input value={formData.selection_process} onChange={e => fd("selection_process", e.target.value)} placeholder="Online Test, Tech Interview, HR" className="bg-background/50 rounded-xl text-xs" />
                </div>
              </div>
            </div>

            {/* Application */}
            <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Link2 size={11} /> Application Details
              </p>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Application URL *</Label>
                <Input value={formData.apply_url} onChange={e => fd("apply_url", e.target.value)} placeholder="https://forms.gle/..." className="bg-background/50 rounded-xl font-mono text-xs" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><CalendarDays size={10} /> Application Deadline</Label>
                  <Input value={formData.deadline} onChange={e => fd("deadline", e.target.value)} placeholder="e.g. Oct 20, 2026 or 2026-10-20" className="bg-background/50 rounded-xl text-xs" />
                </div>

              </div>
            </div>
          </div>

          {/* Sticky Footer Actions */}
          <div className="sticky bottom-0 bg-card/95 backdrop-blur-xl border-t border-border/60 p-5 flex flex-col sm:flex-row items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setModal("ai-input")}
              className="rounded-xl gap-2 text-muted-foreground w-full sm:w-auto"
            >
              <ArrowLeft size={15} /> Re-extract / Back
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => handleSaveJob("draft")}
              className="rounded-xl gap-2 border-white/20 w-full sm:w-auto"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Clock size={15} />}
              Save as Draft
            </Button>
            <Button
              disabled={saving || !formData.title.trim() || !formData.company.trim()}
              onClick={() => handleSaveJob("active")}
              className="rounded-xl gap-2 font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 w-full sm:w-auto px-6"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Confirm & Post Job
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          Manual Form Modal (Add / Edit)
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={modal === "form"} onOpenChange={o => !o && setModal("none")}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingJobId ? "Edit Job Posting" : "Add Job Posting Manually"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Fill in the job details below. Fields marked * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Job Title *</Label>
                <Input required value={formData.title} onChange={e => fd("title", e.target.value)} placeholder="e.g. Software Engineer" className="bg-background rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Company Name *</Label>
                <Input required value={formData.company} onChange={e => fd("company", e.target.value)} placeholder="e.g. Tata Consultancy Services" className="bg-background rounded-xl" />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Job Type</Label>
                <Select value={formData.job_type} onValueChange={(v: JobType) => fd("job_type", v)}>
                  <SelectTrigger className="bg-background rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Co-op">Co-op</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">CTC / Salary</Label>
                <Input value={formData.ctc_package} onChange={e => fd("ctc_package", e.target.value)} placeholder="₹6.5 LPA or ₹25,000/mo" className="bg-background rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Location</Label>
                <Input value={formData.location} onChange={e => fd("location", e.target.value)} placeholder="Kolkata / Hybrid" className="bg-background rounded-xl" />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Eligible Batches</Label>
                <Input value={formData.eligible_batches} onChange={e => fd("eligible_batches", e.target.value)} placeholder="2025, 2026" className="bg-background rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Programmes</Label>
                <Input value={formData.eligible_programmes} onChange={e => fd("eligible_programmes", e.target.value)} placeholder="B.Tech CSE, B.Tech AI" className="bg-background rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Min CGPA</Label>
                <Input type="number" step="0.1" value={formData.min_cgpa} onChange={e => fd("min_cgpa", e.target.value)} placeholder="6.5" className="bg-background rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Application URL *</Label>
              <Input value={formData.apply_url} onChange={e => fd("apply_url", e.target.value)} placeholder="https://forms.gle/..." className="bg-background rounded-xl font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Description & Responsibilities</Label>
              <Textarea value={formData.description} onChange={e => fd("description", e.target.value)} placeholder="Describe key responsibilities..." className="bg-background rounded-xl h-28" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Key Skills</Label>
                <Input value={formData.key_skills} onChange={e => fd("key_skills", e.target.value)} placeholder="React, Java, SQL" className="bg-background rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Selection Process</Label>
                <Input value={formData.selection_process} onChange={e => fd("selection_process", e.target.value)} placeholder="Online Test, Tech Interview, HR" className="bg-background rounded-xl" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Deadline</Label>
                <Input value={formData.deadline} onChange={e => fd("deadline", e.target.value)} placeholder="Oct 20, 2026" className="bg-background rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={formData.status} onValueChange={(v: JobStatus) => fd("status", v)}>
                  <SelectTrigger className="bg-background rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Live)</SelectItem>
                    <SelectItem value="draft">Draft (Hidden)</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setModal("none")} className="rounded-xl">Cancel</Button>
              <Button
                type="button"
                disabled={saving || !formData.title.trim() || !formData.company.trim()}
                onClick={() => handleSaveJob()}
                className="rounded-xl gap-2 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={16} />}
                {editingJobId ? "Save Changes" : "Publish Job Posting"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default AdminJobs;
