import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { 
  Trophy, 
  Layout, 
  Award, 
  Plus, 
  Calendar, 
  BookOpen, 
  User, 
  ArrowRight,
  Zap,
  Star,
  Globe,
  Github,
  MessageSquare,
  Clock,
  ChevronRight,
  ExternalLink,
  Code,
  ShieldCheck,
  History,
  AlertCircle,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { compareDates } from "@/lib/utils";

interface ProfileData {
  id: string;
  full_name: string;
  avatar_url: string;
  points: number;
  projects_count: number;
  wins_count: number;
  programme_name: string;
  role: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  stack: string[];
  status: string;
  review_note: string;
  created_at: string;
}

interface PointsLog {
  id: string;
  amount: number;
  action_type: string;
  description: string;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  type: string;
  location: string;
}

const MemberHome = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [spotlightProject, setSpotlightProject] = useState<any | null>(null);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PointsLog[]>([]);
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setProfile(null);
      setSpotlightProject(null);
      setUserProjects([]);
      setPointsHistory([]);
      setNextEvent(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const userId = user.uid;

      try {
        // Fetch Profile
        const pSnap = await getDoc(doc(db, "profiles", userId));
        if (pSnap.exists()) setProfile({ id: pSnap.id, ...pSnap.data() } as ProfileData);

        // Fetch Spotlight Project
        const spotQ = query(collection(db, "projects"), where("status", "==", "approved"), limit(10));
        const spotSnap = await getDocs(spotQ);
        if (!spotSnap.empty) {
          const spotDocs = spotSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setSpotlightProject(spotDocs[Math.floor(Math.random() * spotDocs.length)]);
        }

        // Fetch User's Projects
        const myProjQ = query(collection(db, "projects"), where("author_id", "==", userId));
        const myProjSnap = await getDocs(myProjQ);
        const myProjects = myProjSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
        myProjects.sort((a, b) => compareDates(a.created_at, b.created_at));
        setUserProjects(myProjects);

        // Fetch Points History
        const historyQ = query(collection(db, "points_history"), where("user_id", "==", userId));
        const historySnap = await getDocs(historyQ);
        const history = historySnap.docs.map(d => ({ id: d.id, ...d.data() })) as PointsLog[];
        history.sort((a, b) => compareDates(a.created_at, b.created_at));
        setPointsHistory(history.slice(0, 5));

        // Fetch Next Event
        const eventQ = query(collection(db, "events"), where("is_upcoming", "==", true), limit(5));
        const eventSnap = await getDocs(eventQ);
        if (!eventSnap.empty) {
          const eventDocs = eventSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[];
          eventDocs.sort((a, b) => compareDates(a.date, b.date, false));
          setNextEvent(eventDocs[0]);
        }
      } catch (err) {
        console.error("Error fetching member home data", err);
      }

      setLoading(false);
    };

    void fetchData();

    // ── Realtime: refresh projects when admin updates status/note ──
    const myProjQ = query(collection(db, "projects"), where("author_id", "==", user.uid));
    const unsubscribe = onSnapshot(myProjQ, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Project[];
      list.sort((a, b) => compareDates(a.created_at, b.created_at));
      setUserProjects(list);
    });

    return () => { unsubscribe(); };
  }, [authLoading, user]);

  const getRank = (points: number) => {
    if (points >= 1000) return { name: "Hub Legend", icon: Star, color: "text-amber-500", progress: 100 };
    if (points >= 500) return { name: "Architect", icon: Award, color: "text-purple-500", progress: ((points - 500) / 500) * 100 };
    if (points >= 200) return { name: "Innovator", icon: Zap, color: "text-indigo-500", progress: ((points - 200) / 300) * 100 };
    if (points >= 50) return { name: "Builder", icon: Layout, color: "text-blue-500", progress: ((points - 50) / 150) * 100 };
    return { name: "Novice", icon: User, color: "text-emerald-500", progress: (points / 50) * 100 };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "text-emerald-500 bg-emerald-500/10";
      case "rejected": return "text-destructive bg-destructive/10";
      case "changes_requested": return "text-amber-500 bg-amber-500/10";
      default: return "text-blue-500 bg-blue-500/10";
    }
  };

  const rank = getRank(profile?.points || 0);

  if (loading || authLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-20 sm:pt-24 pb-12 sm:pb-20 overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Welcome Header */}
        <header className="mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary mb-4">
                Student Command Center
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2">
                Hey, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-400">{profile?.full_name?.split(" ")[0]}</span>
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Working as <span className="text-foreground font-semibold">{profile?.role === 'admin' ? 'Department Staff' : 'Tech Explorer'}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/jobs">
                <Button size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 h-10 px-5 gap-2 text-xs">
                  <Briefcase size={16} /> Job Portal
                </Button>
              </Link>
              {profile?.role === 'admin' && (
                <Link to="/admin-review">
                  <Button size="sm" variant="outline" className="rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all font-bold h-10 px-5 text-primary">
                    <ShieldCheck size={18} className="mr-2" /> Admin Panel
                  </Button>
                </Link>
              )}
              <Link to="/profile">
                <Button size="sm" variant="outline" className="rounded-xl border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all font-medium h-10 px-5">
                  Settings
                </Button>
              </Link>
            </div>
          </motion.div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">
          
          {/* Rank & Points Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[32px] p-5 sm:p-8 flex flex-col justify-between group overflow-hidden relative"
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest mb-1">Rank Progression</p>
                  <h3 className={`text-2xl sm:text-3xl font-black ${rank.color} flex items-center gap-2`}>
                    <rank.icon size={32} /> {rank.name}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl sm:text-4xl font-black text-foreground">{profile?.points}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Total Credits</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${rank.progress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Level {Math.floor((profile?.points || 0) / 100)}</span>
                  <span>Next Level at {1000}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 relative z-10">
              <p className="text-sm font-bold mb-4 flex items-center gap-2">
                <History size={16} className="text-primary" /> Recent Transactions
              </p>
              <div className="space-y-2">
                {pointsHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[180px]">{item.description}</span>
                    <span className="text-xs font-bold text-primary">+{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:opacity-20 transition-all duration-1000 ease-out group-hover:scale-110">
              <rank.icon size={220} />
            </div>
          </motion.div>

          {/* Submissions Spotlight */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 lg:row-span-2 bg-card/60 backdrop-blur-lg border border-white/10 rounded-2xl sm:rounded-[32px] p-5 sm:p-8 flex flex-col group overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layout size={18} className="text-primary" />
                </div>
                <h3 className="font-bold">My Submissions</h3>
              </div>
              <Link to="/projects">
                <Button size="sm" variant="ghost" className="text-xs font-bold gap-1 h-8">
                  View Full Showcase <ChevronRight size={14} />
                </Button>
              </Link>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
              {userProjects.length > 0 ? (
                userProjects.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold truncate max-w-[120px] sm:max-w-[150px]">{p.title}</h4>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${getStatusColor(p.status)}`}>
                        {p.status.replace("_", " ")}
                      </span>
                    </div>
                    {p.review_note && (() => {
                      const noteStyle =
                        p.status === "rejected"
                          ? "bg-destructive/5 border-destructive/20 text-destructive"
                          : p.status === "changes_requested"
                          ? "bg-amber-500/5 border-amber-500/10 text-amber-400"
                          : p.status === "approved"
                          ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400"
                          : "bg-blue-500/5 border-blue-500/10 text-blue-400";
                      return (
                        <div className={`mt-2 flex items-start gap-2 p-2 rounded-lg border ${noteStyle}`}>
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <p className="text-[10px] italic leading-tight">
                            <span className="font-bold not-italic">Admin feedback: </span>{p.review_note}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <div className="w-12 h-12 rounded-full border border-dashed border-white/40 flex items-center justify-center mb-4">
                    <Plus size={20} />
                  </div>
                  <p className="text-xs font-medium text-center">No projects submitted yet.<br/>Start your journey today!</p>
                </div>
              )}
            </div>

            <Link to="/submit-project" className="mt-auto">
              <Button className="w-full bg-foreground text-background font-bold h-11 rounded-2xl hover:bg-foreground/90 transition-all">
                Submit New Project
              </Button>
            </Link>
          </motion.div>

          {/* Quick Hub - Automated Spotlight */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl sm:rounded-[30px] p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 group"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-500">
               <Code size={32} />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Student Spotlight</p>
               {spotlightProject ? (
                 <>
                   <h4 className="text-base font-bold truncate mb-1">{spotlightProject.title}</h4>
                   <p className="text-xs text-muted-foreground truncate">Build by {spotlightProject.author_name}</p>
                 </>
               ) : (
                 <p className="text-xs text-muted-foreground italic">New builds appearing soon...</p>
               )}
            </div>
            <Link to="/projects">
              <Button size="icon" variant="outline" className="rounded-full border-white/10 hover:bg-primary transition-colors hover:text-primary-foreground flex-shrink-0 w-10 h-10">
                <ArrowRight size={18} />
              </Button>
            </Link>
          </motion.div>

          {/* Next Training Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={`lg:col-span-1 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl sm:rounded-[30px] p-5 sm:p-6 flex flex-col justify-between overflow-hidden relative group ${nextEvent ? "cursor-pointer hover:border-indigo-500/40" : ""}`}
          >
            {nextEvent ? (
              <Link to={`/events/${nextEvent.id}`} className="absolute inset-0 z-10" />
            ) : null}
             <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded bg-indigo-500/20 flex items-center justify-center">
                  <Clock size={12} className="text-indigo-400" />
                </div>
                <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">Next Training</span>
             </div>
             <div>
                <h4 className="text-sm font-bold truncate mb-1">{nextEvent?.title || "Workshop Secret"}</h4>
                <p className="text-[10px] text-muted-foreground truncate">{nextEvent?.type || "Department Session"}</p>
             </div>
             <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform">
                <Calendar size={80} className="text-indigo-400" />
             </div>
          </motion.div>

          {/* Resource Toolbelt */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="lg:col-span-1 bg-white/5 border border-white/10 rounded-2xl sm:rounded-[30px] p-5 sm:p-6 flex flex-col justify-between group overflow-hidden"
          >
             <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Toolkit</h4>
             <div className="grid grid-cols-2 gap-2">
                {[Github, Globe, MessageSquare, BookOpen].map((Icon, i) => (
                  <div key={i} className="flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <Icon size={16} className="text-muted-foreground hover:text-primary" />
                  </div>
                ))}
             </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default MemberHome;
