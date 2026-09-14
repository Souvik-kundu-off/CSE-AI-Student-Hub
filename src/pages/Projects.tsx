import { useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Search, Github, ExternalLink, Loader2, Plus, FolderOpen, User2, Eye, Heart, Image as ImageIcon, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { ensureUrl } from "@/lib/utils-url";
import EmptyState from "@/components/ui/EmptyState";

interface Project {
  id: string;
  title: string;
  description: string;
  stack: string[];
  author_id: string;
  author_name: string;
  category: string;
  status: string;
  github_url: string;
  live_url: string;
  youtube_url?: string | null;
  images: string[];
  views_count: number | null;
  likes_count: number | null;
}

const categories = ["All", "AI", "Web", "App", "Hardware"];

const Projects = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"public" | "mine">("public");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const { data: publicProjects = [], isLoading: loadingPublic } = useQuery({
    queryKey: ["projects-public"],
    queryFn: async () => {
      const q = query(
        collection(db, "projects"),
        where("status", "==", "approved"),
        orderBy("created_at", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
    },
  });

  const { data: myProjects = [], isLoading: loadingMine } = useQuery({
    queryKey: ["projects-mine", user?.uid],
    enabled: !!user,
    queryFn: async () => {
      const q = query(
        collection(db, "projects"),
        where("author_id", "==", user!.uid),
        orderBy("created_at", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
    },
  });

  const isLoading = tab === "public" ? loadingPublic : loadingMine;
  const source = tab === "public" ? publicProjects : myProjects;

  const filtered = source
    .filter((p) => filter === "All" || p.category === filter)
    .filter((p) =>
      (p.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <PageLayout>
      <section className="py-8 sm:py-10 border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Projects</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">Built by members.</h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
            Browse approved community projects or manage your own submissions.
          </p>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-4">
          {/* Tabs + CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex gap-1 border border-border rounded-lg p-1 w-fit">
              <button
                onClick={() => setTab("public")}
                className={`px-3.5 py-1.5 text-xs sm:text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  tab === "public" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FolderOpen size={14} /> Public
              </button>
              {user && (
                <button
                  onClick={() => setTab("mine")}
                  className={`px-3.5 py-1.5 text-xs sm:text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                    tab === "mine" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User2 size={14} /> My Projects
                  {myProjects.length > 0 && <span className="text-[10px] opacity-60 ml-1">{myProjects.length}</span>}
                </button>
              )}
            </div>
            {user && (
              <Link to="/submit-project">
                <Button size="sm" className="gap-1.5 text-xs h-8"><Plus size={14} /> Submit Project</Button>
              </Link>
            )}
          </div>

          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-card border-border"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                    filter === c
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={tab === "mine" ? "No submitted projects yet" : "No approved projects found"}
              description={
                tab === "mine"
                  ? "You haven't submitted any projects to the Hub yet."
                  : search || filter !== "All"
                  ? "No projects match your current search or category filter."
                  : "Projects will appear here once students start submitting and admins approve them — be the first!"
              }
              action={
                user ? (
                  <Link to="/submit-project">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs"><Plus size={14} /> Submit a Project</Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] max-w-sm border border-border rounded-xl bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all flex flex-col overflow-hidden group"
                >
                  {/* Cover image */}
                  {p.images?.[0] ? (
                    <div className="w-full h-32 sm:h-40 overflow-hidden bg-accent">
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-28 bg-gradient-to-br from-primary/5 to-accent flex items-center justify-center">
                      <ImageIcon size={28} className="text-muted-foreground/30" />
                    </div>
                  )}

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {p.category && <span className="text-[11px] font-medium uppercase tracking-wider text-primary">{p.category}</span>}
                        {p.youtube_url && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full" title="Includes Video Demo">
                            <Video className="w-2.5 h-2.5" /> Video
                          </span>
                        )}
                        {tab === "mine" && p.status !== "approved" && (
                          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            p.status === "pending" ? "bg-blue-500/10 text-blue-500"
                            : p.status === "rejected" ? "bg-destructive/10 text-destructive"
                            : "bg-amber-500/10 text-amber-500"
                          }`}>
                            {p.status.replace("_", " ")}
                          </span>
                        )}
                      </div>
                      {/* External link icons — stop propagation so they don't trigger the card Link */}
                      <div className="flex gap-2 shrink-0">
                        {p.github_url && (
                          <a href={ensureUrl(p.github_url)} target="_blank" rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-foreground">
                            <Github className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {p.live_url && (
                          <a href={ensureUrl(p.live_url)} target="_blank" rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <h3 className="font-semibold text-[15px] mb-1.5 group-hover:text-primary transition-colors">{p.title}</h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 flex-1 line-clamp-2">{p.description}</p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {p.stack?.slice(0, 4).map((t, j) => (
                        <span key={j} className="text-[11px] px-2 py-0.5 rounded bg-accent text-muted-foreground">{t}</span>
                      ))}
                      {p.stack?.length > 4 && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-accent text-muted-foreground">+{p.stack.length - 4}</span>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground truncate">by {p.author_name || "—"}</span>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {p.views_count ? <span className="flex items-center gap-1"><Eye size={11} />{p.views_count}</span> : null}
                        {p.likes_count ? <span className="flex items-center gap-1"><Heart size={11} />{p.likes_count}</span> : null}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Projects;
