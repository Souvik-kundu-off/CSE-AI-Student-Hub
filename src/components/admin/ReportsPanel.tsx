import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  Download, Loader2, Users, Layout, Calendar, Trophy, FileSpreadsheet, Megaphone, FileText, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { logAdminAction } from "./AuditLog";

interface ExportConfig {
  label: string;
  description: string;
  icon: any;
  table: string;
  columns: string[];
  headers: string[];
  accent: string;
  filenamePrefix: string;
  orderBy?: string;
  orderAsc?: boolean;
  filter?: { col: string; val: string };
}

const ALL_EXPORTS: (ExportConfig & { roles: string[] })[] = [
  {
    roles: ["superadmin", "admin", "faculty", "moderator"],
    label: "Member Directory",
    description: "Full list of all registered members with email, programme, role, and points.",
    icon: Users,
    table: "profiles",
    columns: ["full_name", "email", "role", "programme_name", "points", "created_at"],
    headers: ["Name", "Email", "Role", "Programme", "Points", "Joined"],
    accent: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    filenamePrefix: "members",
  },
  {
    roles: ["superadmin", "admin", "faculty", "moderator"],
    label: "Leaderboard",
    description: "Ranked list of members by hub credits — top performers highlighted.",
    icon: Trophy,
    table: "profiles",
    columns: ["full_name", "email", "points", "programme_name"],
    headers: ["Name", "Email", "Points", "Programme"],
    accent: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    filenamePrefix: "leaderboard",
    orderBy: "points",
    orderAsc: false,
  },
  {
    roles: ["superadmin", "admin", "faculty", "moderator"],
    label: "Project Submissions",
    description: "All submitted projects with status, author, tech stack, and review notes.",
    icon: Layout,
    table: "projects",
    columns: ["title", "author_name", "status", "stack", "github_url", "live_url", "review_note", "created_at"],
    headers: ["Title", "Author", "Status", "Stack", "GitHub", "Live URL", "Review Note", "Submitted"],
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    filenamePrefix: "projects",
  },
  {
    roles: ["superadmin", "admin", "event_manager"],
    label: "Events List",
    description: "Complete list of all events with date, location, type, and capacity.",
    icon: Calendar,
    table: "events",
    columns: ["title", "type", "date", "location", "mode", "spots", "is_upcoming", "created_at"],
    headers: ["Title", "Type", "Date", "Location", "Mode", "Spots", "Upcoming", "Created"],
    accent: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    filenamePrefix: "events",
  },
  {
    roles: ["superadmin", "admin", "content_editor"],
    label: "Blog Posts",
    description: "All blog posts with publish status, category, and author.",
    icon: FileText,
    table: "blog_posts",
    columns: ["title", "category", "author_name", "is_published", "published_at"],
    headers: ["Title", "Category", "Author", "Published", "Date"],
    accent: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    filenamePrefix: "blog_posts",
  },
  {
    roles: ["superadmin", "admin", "content_editor"],
    label: "Resources",
    description: "All community resources with type, category, and link.",
    icon: BookOpen,
    table: "resources",
    columns: ["title", "type", "category", "url", "created_at"],
    headers: ["Title", "Type", "Category", "URL", "Added"],
    accent: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    filenamePrefix: "resources",
  },
  {
    roles: ["superadmin", "admin", "content_editor", "event_manager"],
    label: "Broadcasts",
    description: "All system broadcasts with type, status, and schedule.",
    icon: Megaphone,
    table: "announcements",
    columns: ["title", "type", "is_active", "publish_at", "expires_at", "created_at"],
    headers: ["Title", "Type", "Active", "Publish At", "Expires At", "Created"],
    accent: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    filenamePrefix: "broadcasts",
  },
];

const ReportsPanel = ({ role }: { role?: string }) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const visibleExports = ALL_EXPORTS.filter(e => !role || e.roles.includes(role));

  const handleExport = async (config: ExportConfig) => {
    const key = config.filenamePrefix;
    setExporting(key);
    try {
      const snapshot = await getDocs(collection(db, config.table));
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      if (config.filter) {
        data = data.filter((row: any) => String(row[config.filter!.col]) === String(config.filter!.val));
      }
      if (config.orderBy) {
        const col = config.orderBy;
        const asc = config.orderAsc ?? false;
        data.sort((a: any, b: any) => {
          const valA = a[col] ?? 0;
          const valB = b[col] ?? 0;
          return asc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        });
      }

      if (!data || data.length === 0) { toast.error("No data to export"); return; }

      const csvRows = [config.headers.join(",")];
      for (const row of data) {
        const values = config.columns.map(col => {
          let val = (row as any)[col];
          if (val && typeof val === "object" && typeof val.toDate === "function") {
            val = val.toDate().toISOString();
          }
          if (val === null || val === undefined) return "";
          if (Array.isArray(val)) return `"${val.join("; ")}"`;
          const str = String(val);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
          return str;
        });
        csvRows.push(values.join(","));
      }

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${key}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${config.label} exported! (${data.length} rows)`);
      await logAdminAction({ actionType: "EXPORT", targetType: "REPORTS", targetId: key, targetLabel: config.label, details: `Exported ${data.length} rows as CSV` });
    } catch (e: any) {
      toast.error("Export failed");
      console.error(e);
    }
    setExporting(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-primary" /> Reports & Exports
        </h2>
        <p className="text-sm text-muted-foreground">
          Download hub data as CSV files for analysis, record-keeping, or presentations.
          {role && role !== "admin" && role !== "superadmin" && (
            <span className="ml-2 text-primary font-medium">(Showing reports relevant to your role)</span>
          )}
        </p>
      </div>

      {visibleExports.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl py-20 text-center text-sm text-muted-foreground">
          No reports are available for your role.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visibleExports.map((config, index) => {
            const Icon = config.icon;
            const isExporting = exporting === config.filenamePrefix;
            return (
              <motion.div
                key={config.filenamePrefix}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
                className="border border-white/5 rounded-[24px] p-6 bg-card/50 hover:border-primary/20 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${config.accent}`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm mb-1">{config.label}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">{config.description}</p>
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                      {config.headers.slice(0, 4).map(h => (
                        <span key={h} className="px-1.5 py-0.5 bg-white/5 rounded">{h}</span>
                      ))}
                      {config.headers.length > 4 && (
                        <span className="px-1.5 py-0.5 bg-white/5 rounded">+{config.headers.length - 4}</span>
                      )}
                    </div>
                    <Button
                      onClick={() => handleExport(config)}
                      disabled={isExporting}
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-9 gap-2 font-bold"
                    >
                      {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={14} />}
                      {isExporting ? "Exporting..." : "Download CSV"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReportsPanel;
