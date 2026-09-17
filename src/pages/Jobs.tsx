import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Search,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  GraduationCap,
  IndianRupee,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { JobPosting, JobType } from "@/types/job";
import { safeFormatDate, compareDates } from "@/lib/utils";
import { ensureUrl } from "@/lib/utils-url";
import { useAuth } from "@/contexts/AuthContext";
import { isStaff } from "@/lib/permissions";

const Jobs = () => {
  const { role } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [batchFilter, setBatchFilter] = useState<string>("all");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "job_postings"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting));
      list.sort((a, b) => compareDates(a.created_at, b.created_at));
      setJobs(list.filter(j => j.status !== "draft"));
    } catch (error) {
      console.error("Failed to load job postings:", error);
    }
    setLoading(false);
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.key_skills?.some(s => s.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === "all" || j.job_type === typeFilter;

    const matchesBatch =
      batchFilter === "all" ||
      !j.eligible_batches ||
      j.eligible_batches.length === 0 ||
      j.eligible_batches.includes(batchFilter);

    return matchesSearch && matchesType && matchesBatch;
  });

  return (
    <PageLayout>
      <div className="min-h-screen pb-20">
        {/* Header Hero Section */}
        <section className="relative pt-24 pb-16 border-b border-border/50 overflow-hidden bg-card/30 backdrop-blur-xl">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />

          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[11px] font-bold uppercase tracking-widest text-primary mb-4">
                  <Briefcase size={12} />
                  University Placement Hub
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3">
                  Campus <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-400 to-purple-400">Careers & Opportunities</span>
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
                  Structured job descriptions, eligibility criteria, and direct application links parsed directly from department placement drives.
                </p>
              </div>

              {isStaff(role) && (
                <Link to="/admin/jobs">
                  <Button className="rounded-xl gap-2 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                    <ShieldCheck size={16} /> Manage Job Postings
                  </Button>
                </Link>
              )}
            </div>

            {/* Filter Bar */}
            <div className="mt-10 p-3 sm:p-4 bg-card/80 border border-border/80 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search role, company, skills (e.g. TCS, React, SDE)..."
                  className="pl-10 bg-background/50 border-border/60 rounded-xl text-xs sm:text-sm h-11"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px] sm:w-[160px] bg-background/50 border-border/60 rounded-xl text-xs font-semibold h-11">
                    <SelectValue placeholder="Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Co-op">Co-op</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger className="w-[130px] sm:w-[150px] bg-background/50 border-border/60 rounded-xl text-xs font-semibold h-11">
                    <SelectValue placeholder="Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    <SelectItem value="2025">Batch 2025</SelectItem>
                    <SelectItem value="2026">Batch 2026</SelectItem>
                    <SelectItem value="2027">Batch 2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Job Listings */}
        <section className="container mx-auto px-4 max-w-6xl py-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-30 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground animate-pulse font-medium">Fetching active placement drives...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-border/60 rounded-[32px] p-8 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
                <Briefcase size={24} />
              </div>
              <h3 className="font-bold text-lg mb-1">No Jobs Found</h3>
              <p className="text-xs text-muted-foreground mb-6">No active placement opportunities match your search criteria.</p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => { setSearch(""); setTypeFilter("all"); setBatchFilter("all"); }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredJobs.map((job) => (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-card/60 hover:bg-card border border-border/60 hover:border-primary/30 rounded-[28px] p-6 sm:p-7 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Meta Bar */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden text-primary font-black text-lg">
                            {job.company_logo ? (
                              <img src={job.company_logo} alt={job.company} className="w-full h-full object-cover" />
                            ) : (
                              job.company.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-foreground/90 flex items-center gap-1.5">
                              {job.company}
                              <CheckCircle2 size={13} className="text-emerald-500" />
                            </h4>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin size={11} /> {job.location || "Pan-India"}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          job.job_type === "Internship"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {job.job_type}
                        </span>
                      </div>

                      {/* Job Title & CTC */}
                      <Link to={`/jobs/${job.id}`}>
                        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors mb-2 line-clamp-1">
                          {job.title}
                        </h3>
                      </Link>

                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {job.ctc_package && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                            <IndianRupee size={12} /> {job.ctc_package}
                          </span>
                        )}

                        {job.eligible_batches && job.eligible_batches.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-accent border border-border/40 text-muted-foreground text-[11px] font-medium">
                            <GraduationCap size={12} /> Batches: {job.eligible_batches.join(", ")}
                          </span>
                        )}
                      </div>

                      {/* Description Preview */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-5">
                        {job.description}
                      </p>

                      {/* Key Skills */}
                      {job.key_skills && job.key_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          {job.key_skills.slice(0, 4).map((skill, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-medium text-muted-foreground"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.key_skills.length > 4 && (
                            <span className="px-2 py-0.5 text-[10px] text-muted-foreground">
                              +{job.key_skills.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {job.deadline ? `Deadline: ${job.deadline}` : `Posted ${safeFormatDate(job.created_at, "MMM d")}`}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link to={`/jobs/${job.id}`}>
                          <Button size="sm" variant="ghost" className="rounded-xl text-xs font-bold gap-1">
                            Details
                          </Button>
                        </Link>

                        {job.apply_url && (
                          <a href={ensureUrl(job.apply_url)} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="rounded-xl text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                              Apply Now <ArrowUpRight size={13} />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
};

export default Jobs;
