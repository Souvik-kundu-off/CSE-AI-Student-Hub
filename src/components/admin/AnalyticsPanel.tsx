import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  BarChart3, Users, Layout, Trophy, Loader2, Clock, CheckCircle2,
  Calendar, Megaphone, FileText, BookOpen, BookMarked, GraduationCap,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { AppRole } from "@/lib/permissions";

// ─────────── Types ───────────

interface Stat { label: string; value: number; icon: any; accent: string }
interface ListItem { primary: string; secondary: string; meta: string }

// ─────────── Shared sub-components ───────────

const StatCard = ({ label, value, icon: Icon, accent }: Stat) => (
  <div className="border border-border rounded-xl p-4 bg-card flex flex-col gap-2">
    <Icon size={16} className={accent} />
    <p className="text-2xl font-bold tabular-nums">{value}</p>
    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
  </div>
);

const ListBlock = ({
  title, icon: Icon, items, empty,
}: {
  title: string; icon: any; empty: string;
  items: ListItem[];
}) => (
  <div className="border border-border rounded-xl p-5 bg-card">
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
      <Icon size={14} className="text-muted-foreground" />
      <h3 className="font-semibold text-sm">{title}</h3>
    </div>
    {items.length === 0 ? (
      <p className="text-xs text-muted-foreground py-6 text-center">{empty}</p>
    ) : (
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium truncate">{it.primary}</p>
              <p className="text-[11px] text-muted-foreground truncate">{it.secondary}</p>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium tabular-nums shrink-0">{it.meta}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ─────────── Role-specific panel components ───────────

/** admin / superadmin: full hub analytics */
const AdminOverviewPanel = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [profilesSnap, projectsSnap, eventsSnap] = await Promise.all([
          getDocs(collection(db, "profiles")),
          getDocs(collection(db, "projects")),
          getDocs(collection(db, "events")),
        ]);
        const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const totalPoints = profiles.reduce((s: number, p: any) => s + (p.points || 0), 0);
        const recent = [...profiles].sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 5);
        const top = [...profiles].sort((a: any, b: any) => (b.points || 0) - (a.points || 0)).slice(0, 5);
        const pendingProjects = projects
          .filter((p: any) => p.status === "pending")
          .sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""))
          .slice(0, 5);

        setData({
          members: profiles.length,
          projects: projects.length,
          pending: projects.filter((p: any) => p.status === "pending").length,
          approved: projects.filter((p: any) => p.status === "approved").length,
          events: events.length,
          totalPoints,
          recent,
          top,
          pendingProjects,
        });
      } catch (err) {
        console.error("Admin analytics error", err);
      }
      setLoading(false);
    })();
  }, []);

  if (loading || !data) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const stats: Stat[] = [
    { label: "Members",        value: data.members,     icon: Users,       accent: "text-blue-500" },
    { label: "Projects",       value: data.projects,    icon: Layout,      accent: "text-emerald-500" },
    { label: "Pending Review", value: data.pending,     icon: Clock,       accent: "text-amber-500" },
    { label: "Approved",       value: data.approved,    icon: CheckCircle2,accent: "text-emerald-500" },
    { label: "Events",         value: data.events,      icon: Calendar,    accent: "text-purple-500" },
    { label: "Total Credits",  value: data.totalPoints, icon: Trophy,      accent: "text-yellow-500" },
  ];

  return (
    <div className="space-y-6">
      <Header title="Hub Analytics" subtitle="Full live overview of community activity." />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <ListBlock title="Pending Reviews" icon={Clock} empty="All clear!"
          items={data.pendingProjects.map((p: any) => ({ primary: p.title, secondary: `by ${p.author_name}`, meta: p.created_at ? format(new Date(p.created_at), "MMM d") : "" }))} />
        <ListBlock title="Top Members" icon={Trophy} empty="No members yet."
          items={data.top.map((m: any) => ({ primary: m.full_name || "—", secondary: "Hub member", meta: `${m.points || 0} pts` }))} />
        <ListBlock title="Recent Signups" icon={Users} empty="No new members."
          items={data.recent.map((m: any) => ({ primary: m.full_name || "New member", secondary: m.email || "", meta: m.created_at ? format(new Date(m.created_at), "MMM d") : "" }))} />
      </div>
    </div>
  );
};

/** faculty / mentor: student & progress focus */
const FacultyOverviewPanel = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [profilesSnap, projectsSnap] = await Promise.all([
          getDocs(collection(db, "profiles")),
          getDocs(collection(db, "projects")),
        ]);
        const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const activeStudents = profiles.filter((p: any) => p.role === "member").length;
        const pending = projects.filter((p: any) => p.status === "pending").length;
        const top = [...profiles].sort((a: any, b: any) => (b.points || 0) - (a.points || 0)).slice(0, 8);
        const recent = [...profiles].sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 5);

        setData({ members: activeStudents, projects: projects.length, pending, top, recent });
      } catch (err) {
        console.error("Faculty analytics error", err);
      }
      setLoading(false);
    })();
  }, []);

  if (loading || !data) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const stats: Stat[] = [
    { label: "Active Students",     value: data.members,  icon: GraduationCap, accent: "text-blue-500" },
    { label: "Project Submissions", value: data.projects, icon: Layout,        accent: "text-emerald-500" },
    { label: "Pending Review",      value: data.pending,  icon: Clock,         accent: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <Header title="Student Overview" subtitle="Monitor member progress, submissions, and leaderboard." />
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <ListBlock title="🏆 Top Performers" icon={Trophy} empty="No members yet."
          items={data.top.map((m: any) => ({ primary: m.full_name || "—", secondary: m.programme_name || "Member", meta: `${m.points || 0} pts` }))} />
        <ListBlock title="Recent Joiners" icon={Users} empty="No recent signups."
          items={data.recent.map((m: any) => ({ primary: m.full_name || "New student", secondary: m.programme_name || m.email, meta: m.created_at ? format(new Date(m.created_at), "MMM d") : "" }))} />
      </div>
    </div>
  );
};

/** event_manager: events & registrations focus */
const EventManagerOverviewPanel = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "events"));
        const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const upcoming = events.filter((e: any) => e.is_upcoming).length;
        const past = events.filter((e: any) => !e.is_upcoming).length;
        const recentEvents = [...events].sort((a: any, b: any) => (a.date || "").localeCompare(b.date || "")).slice(0, 6);

        setData({ upcoming, past, total: events.length, recentEvents });
      } catch (err) {
        console.error("Event manager analytics error", err);
      }
      setLoading(false);
    })();
  }, []);

  if (loading || !data) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const stats: Stat[] = [
    { label: "Upcoming Events", value: data.upcoming, icon: Calendar, accent: "text-purple-500" },
    { label: "Past Events",     value: data.past,     icon: CheckCircle2, accent: "text-emerald-500" },
    { label: "Total Events",    value: data.total,    icon: Calendar, accent: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <Header title="Events Overview" subtitle="Track upcoming events, registrations, and capacity." />
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Calendar size={14} className="text-muted-foreground" /> Upcoming Events</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {data.recentEvents.filter((e: any) => e.is_upcoming).length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-sm text-muted-foreground col-span-full">No upcoming events scheduled.</div>
          ) : data.recentEvents.filter((e: any) => e.is_upcoming).map((ev: any) => (
            <div key={ev.id} className="border border-white/5 rounded-xl p-4 bg-card/50 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{ev.title}</p>
                <p className="text-xs text-muted-foreground">{ev.location || "TBD"} · {ev.spots ? `${ev.spots} spots` : "Open"}</p>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                {ev.date ? format(new Date(ev.date), "MMM d") : "TBA"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** content_editor: content & publishing focus */
const ContentEditorOverviewPanel = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [postsSnap, resourcesSnap, announcementsSnap] = await Promise.all([
          getDocs(collection(db, "blog_posts")),
          getDocs(collection(db, "resources")),
          getDocs(collection(db, "announcements")),
        ]);
        const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const resources = resourcesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const announcements = announcementsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const published = posts.filter((p: any) => p.is_published).length;
        const drafts = posts.filter((p: any) => !p.is_published).length;
        const broadcasts = announcements.filter((a: any) => a.is_active).length;
        const recentPosts = [...posts].sort((a: any, b: any) => (b.published_at || "").localeCompare(a.published_at || "")).slice(0, 6);

        setData({ published, drafts, resources: resources.length, broadcasts, recentPosts });
      } catch (err) {
        console.error("Content editor analytics error", err);
      }
      setLoading(false);
    })();
  }, []);

  if (loading || !data) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const stats: Stat[] = [
    { label: "Published Posts", value: data.published,  icon: FileText,  accent: "text-emerald-500" },
    { label: "Drafts",          value: data.drafts,     icon: Clock,     accent: "text-amber-500" },
    { label: "Resources",       value: data.resources,  icon: BookOpen,  accent: "text-blue-500" },
    { label: "Active Alerts",   value: data.broadcasts, icon: Megaphone, accent: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <Header title="Content Overview" subtitle="Track published posts, drafts, resources, and broadcasts." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText size={14} className="text-muted-foreground" /> Recent Blog Posts</h3>
        <div className="space-y-2">
          {data.recentPosts.map((p: any) => (
            <div key={p.id} className="border border-white/5 rounded-xl p-4 bg-card/50 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.category} · by {p.author_name || "Unknown"}</p>
              </div>
              <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg ${p.is_published ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                {p.is_published ? "Live" : "Draft"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** moderator: moderation queue focus */
const ModeratorOverviewPanel = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "projects"));
        const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const pending = projects.filter((p: any) => p.status === "pending").length;
        const approved = projects.filter((p: any) => p.status === "approved").length;
        const rejected = projects.filter((p: any) => p.status === "rejected").length;
        const changes = projects.filter((p: any) => p.status === "changes_requested").length;
        const recentPending = projects
          .filter((p: any) => p.status === "pending")
          .sort((a: any, b: any) => (a.created_at || "").localeCompare(b.created_at || ""))
          .slice(0, 8);

        setData({ pending, approved, rejected, changes, recentPending });
      } catch (err) {
        console.error("Moderator analytics error", err);
      }
      setLoading(false);
    })();
  }, []);

  if (loading || !data) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const stats: Stat[] = [
    { label: "Pending",           value: data.pending,   icon: AlertCircle, accent: "text-amber-500" },
    { label: "Approved",          value: data.approved,  icon: CheckCircle2,accent: "text-emerald-500" },
    { label: "Rejected",          value: data.rejected,  icon: Clock,       accent: "text-red-500" },
    { label: "Changes Requested", value: data.changes,   icon: BookMarked,  accent: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <Header title="Moderation Queue" subtitle="Track and review pending project submissions." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-500" />
          Awaiting Review ({data.pending} projects)
        </h3>
        {data.recentPending.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-sm text-muted-foreground">🎉 All caught up! No pending submissions.</div>
        ) : (
          <div className="space-y-2">
            {data.recentPending.map((p: any) => (
              <div key={p.id} className="border border-amber-500/10 rounded-xl p-4 bg-amber-500/5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground">by {p.author_name} · {(p.stack || []).slice(0, 3).join(", ")}</p>
                </div>
                <span className="text-[10px] font-bold text-amber-500">{p.created_at ? format(new Date(p.created_at), "MMM d") : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────── Header shared sub-component ───────────
const Header = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div>
    <h2 className="text-xl font-bold flex items-center gap-2">
      <BarChart3 size={20} className="text-primary" /> {title}
    </h2>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </div>
);

// ─────────── Main export — picks the right panel by role ───────────
const AnalyticsPanel = ({ role }: { role?: string }) => {
  switch (role) {
    case "superadmin":
    case "admin":
      return <AdminOverviewPanel />;
    case "faculty":
      return <FacultyOverviewPanel />;
    case "event_manager":
      return <EventManagerOverviewPanel />;
    case "content_editor":
      return <ContentEditorOverviewPanel />;
    case "moderator":
      return <ModeratorOverviewPanel />;
    default:
      return <AdminOverviewPanel />;
  }
};

export default AnalyticsPanel;
