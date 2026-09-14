import PageLayout from "@/components/PageLayout";
import { Loader2, Megaphone, AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

const typeMeta: Record<string, { icon: any; cls: string; label: string }> = {
  info:     { icon: Info,          cls: "text-blue-500 bg-blue-500/10 border-blue-500/20",          label: "Info" },
  warning:  { icon: AlertTriangle, cls: "text-amber-500 bg-amber-500/10 border-amber-500/20",       label: "Warning" },
  critical: { icon: AlertCircle,   cls: "text-red-500 bg-red-500/10 border-red-500/20",             label: "Critical" },
  success:  { icon: CheckCircle2,  cls: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "Success" },
};

const Broadcasts = () => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["broadcasts-public"],
    queryFn: async () => {
      const q = query(
        collection(db, "announcements"),
        where("is_active", "==", true),
        orderBy("created_at", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
    },
  });

  return (
    <PageLayout>
      <section className="section-padding border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Broadcasts</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Announcements & alerts.</h1>
          <p className="text-muted-foreground text-[15px] max-w-md mx-auto">
            All the latest updates from the CSE-AI department team in one place.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto px-4 max-w-3xl">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm flex flex-col items-center gap-3">
              <Megaphone className="w-8 h-8 opacity-40" />
              No active broadcasts right now.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((a) => {
                const meta = typeMeta[a.type] ?? typeMeta.info;
                const Icon = meta.icon;
                return (
                  <article key={a.id} className={`border rounded-xl p-5 bg-card ${meta.cls.split(" ").find(c => c.startsWith("border-")) || "border-border"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${meta.cls}`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-base">{a.title}</h3>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{meta.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.content}</p>
                        <p className="text-[11px] text-muted-foreground mt-3">
                          {format(new Date(a.created_at), "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Broadcasts;
