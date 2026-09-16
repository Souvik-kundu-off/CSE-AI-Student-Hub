import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Github, Loader2, FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { ensureUrl } from "@/lib/utils-url";
import EmptyState from "@/components/ui/EmptyState";

const FeaturedProjects = () => {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["featured_projects"],
    queryFn: async () => {
      const q = query(collection(db, "projects"), orderBy("created_at", "desc"), limit(3));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },
  });

  return (
    <section className="section-padding border-t border-border relative overflow-hidden">
      {/* Floating GSA logos */}
      <img src="/all-logo-gsa/06 (10).png" alt="" aria-hidden="true"
        className="hidden sm:block absolute top-10 right-[3%] w-14 md:w-26 opacity-30 pointer-events-none select-none"
        style={{ animation: "projFloat 9s ease-in-out 1s infinite" }} />
      <img src="/all-logo-gsa/01 (1).png" alt="" aria-hidden="true"
        className="hidden sm:block absolute bottom-12 left-[5%] w-12 md:w-22 opacity-35 pointer-events-none select-none"
        style={{ animation: "projFloat 7s ease-in-out infinite" }} />
      <style>{`@keyframes projFloat { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-16px) rotate(-2deg)} }`}</style>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 sm:mb-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Showcase</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Featured Projects</h2>
          </div>
          <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 shrink-0">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No featured projects yet"
            description="Projects will appear here once students start submitting — be the first to showcase your build."
            action={
              <Link to="/submit-project">
                <span className="text-xs text-primary hover:underline font-medium">Submit a project &rarr;</span>
              </Link>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="group border border-border rounded-xl overflow-hidden hover:border-foreground/20 transition-all bg-card flex flex-col">
                {/* Cover image */}
                {p.images?.[0] && (
                  <div className="w-full h-40 overflow-hidden bg-accent">
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-primary">{p.category || "Project"}</span>
                  {p.status === "approved" && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Live</span>
                  )}
                </div>
                <h3 className="font-semibold text-[15px] mb-1.5 group-hover:text-primary transition-colors">{p.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 flex-1">{p.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.tags?.map((t: string, j: number) => (
                    <span key={j} className="text-[11px] px-2 py-0.5 rounded bg-accent text-muted-foreground">{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">{p.author_name || "Club Member"}</span>
                  <div className="flex gap-2">
                    {p.github_url && (
                      <button
                        type="button"
                        title="GitHub Repository"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(ensureUrl(p.github_url), "_blank", "noopener,noreferrer");
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      >
                        <Github className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {p.live_url && (
                      <button
                        type="button"
                        title="Live Demo"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(ensureUrl(p.live_url), "_blank", "noopener,noreferrer");
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProjects;
