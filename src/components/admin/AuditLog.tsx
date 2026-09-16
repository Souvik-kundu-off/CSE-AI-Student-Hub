import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, getDocs, doc, getDoc, serverTimestamp } from "firebase/firestore";
import {
  ScrollText, Search, Filter, Loader2, Shield, CheckCircle, XCircle,
  Settings, Trophy, Megaphone, User, Calendar, ChevronDown, RefreshCw,
  Trash2, Plus, Edit3, Clock, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { safeFormatDate } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export interface AuditEntry {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  target_type: string;
  target_id: string;
  target_label: string;
  details: string;
  created_at: string;
}

const ACTION_ICONS: Record<string, any> = {
  APPROVE: CheckCircle,
  REJECT: XCircle,
  PAUSE: Clock,
  DELETE: Trash2,
  CREATE: Plus,
  UPDATE: Edit3,
  ROLE_CHANGE: Shield,
  POINTS_ADJUST: Trophy,
  BROADCAST: Megaphone,
  DEFAULT: Settings,
};

const ACTION_COLORS: Record<string, string> = {
  APPROVE: "text-emerald-500 bg-emerald-500/10",
  REJECT: "text-red-500 bg-red-500/10",
  PAUSE: "text-amber-500 bg-amber-500/10",
  DELETE: "text-red-500 bg-red-500/10",
  CREATE: "text-blue-500 bg-blue-500/10",
  UPDATE: "text-purple-500 bg-purple-500/10",
  ROLE_CHANGE: "text-primary bg-primary/10",
  POINTS_ADJUST: "text-yellow-500 bg-yellow-500/10",
  BROADCAST: "text-cyan-500 bg-cyan-500/10",
  DEFAULT: "text-muted-foreground bg-white/5",
};

// Utility to log admin actions — call this from other admin components
export const logAdminAction = async ({
  actionType,
  targetType,
  targetId,
  targetLabel,
  details,
}: {
  actionType: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  details: string;
}) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const profileSnap = await getDoc(doc(db, "profiles", user.uid));
    const profile = profileSnap.exists() ? profileSnap.data() : null;

    await addDoc(collection(db, "admin_audit_log"), {
      admin_id: user.uid,
      admin_name: profile?.full_name || user.displayName || user.email || "Unknown",
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      target_label: targetLabel,
      details,
      created_at: serverTimestamp(),
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
};

const AuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTarget, setFilterTarget] = useState<string>("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "admin_audit_log"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      setEntries(snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as AuditEntry[]);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    }
    setLoading(false);
  };

  const filtered = entries.filter((e) => {
    const matchSearch =
      !search ||
      e.admin_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.target_label?.toLowerCase().includes(search.toLowerCase()) ||
      e.details?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || e.action_type === filterType;
    const matchTarget = filterTarget === "all" || e.target_type === filterTarget;
    return matchSearch && matchType && matchTarget;
  });

  const uniqueActionTypes = [...new Set(entries.map((e) => e.action_type))];
  const uniqueTargetTypes = [...new Set(entries.map((e) => e.target_type))];

  const exportCSV = () => {
    const headers = ["Date", "Time", "Admin", "Action", "Target Type", "Target", "Details"];
    const rows = entries.map(e => [
      safeFormatDate(e.created_at, "yyyy-MM-dd"),
      safeFormatDate(e.created_at, "HH:mm:ss"),
      e.admin_name,
      e.action_type,
      e.target_type,
      e.target_label,
      `"${(e.details || "").replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${entries.length} log entries`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ScrollText size={20} className="text-primary" /> Audit Log
          </h2>
          <p className="text-sm text-muted-foreground">
            Complete trail of all admin actions across the hub.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2 rounded-xl" disabled={entries.length === 0}>
            <Download size={14} /> Export All
          </Button>
          <Button variant="outline" onClick={fetchLogs} className="gap-2 rounded-xl">
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search admin, target, or details..."
            className="pl-9 bg-card border-white/10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-44 bg-card border-white/10 rounded-xl">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActionTypes.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTarget} onValueChange={setFilterTarget}>
          <SelectTrigger className="w-full sm:w-44 bg-card border-white/10 rounded-xl">
            <SelectValue placeholder="Target Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Targets</SelectItem>
            {uniqueTargetTypes.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log Entries */}
      <div className="bg-card/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-sm">
            {entries.length === 0
              ? "No audit history yet. Actions will appear here as admins use the dashboard."
              : "No results matching your filters."}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((entry, index) => {
              const IconComp = ACTION_ICONS[entry.action_type] || ACTION_ICONS.DEFAULT;
              const colorClass = ACTION_COLORS[entry.action_type] || ACTION_COLORS.DEFAULT;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    <IconComp size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-bold">{entry.admin_name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground">
                        {entry.action_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-medium text-foreground/80">{entry.target_label}</span>
                      {entry.details && <> — {entry.details}</>}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {safeFormatDate(entry.created_at, "MMM d, yyyy")}
                      </span>
                      <span>{safeFormatDate(entry.created_at, "h:mm a")}</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 font-medium">
                        {entry.target_type}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
