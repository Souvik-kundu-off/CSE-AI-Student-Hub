import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X, Megaphone, Info, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
}

const GlobalAlertBanner = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "announcements"), where("is_active", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Announcement[];
      const valid = list.filter((a: any) => {
        const pubAt = a.publish_at ? new Date(a.publish_at) : null;
        const expAt = a.expires_at ? new Date(a.expires_at) : null;
        if (pubAt && pubAt > now) return false;
        if (expAt && expAt < now) return false;
        return true;
      });

      if (valid.length > 0) {
        setAnnouncement(valid[0]);
        setIsVisible(true);
      } else {
        setAnnouncement(null);
        setIsVisible(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isVisible || !announcement) return null;

  const getTheme = () => {
    switch (announcement.type) {
      case "critical":
        return {
          bg: "bg-red-600",
          icon: <Zap className="w-4 h-4 text-white animate-pulse" />,
          label: "Critical Update"
        };
      case "warning":
        return {
          bg: "bg-amber-500",
          icon: <AlertTriangle className="w-4 h-4 text-white" />,
          label: "Note"
        };
      case "success":
        return {
          bg: "bg-emerald-600",
          icon: <Zap className="w-4 h-4 text-white" />,
          label: "Good News"
        };
      default:
        return {
          bg: "bg-primary",
          icon: <Megaphone className="w-4 h-4 text-white" />,
          label: "Broadcast"
        };
    }
  };

  const theme = getTheme();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`relative z-[60] ${theme.bg} text-white selection:bg-white/20`}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="hidden sm:flex w-8 h-8 rounded-full bg-white/20 items-center justify-center flex-shrink-0">
                {theme.icon}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded flex-shrink-0 w-fit">
                  {theme.label}
                </span>
                <p className="text-sm font-bold truncate tracking-tight">
                  {announcement.title}
                  <span className="hidden md:inline font-medium opacity-90 ml-2">— {announcement.content}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsVisible(false)}
                className="p-1 px-2 rounded hover:bg-white/10 transition-colors text-xs font-bold border border-white/20"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalAlertBanner;
