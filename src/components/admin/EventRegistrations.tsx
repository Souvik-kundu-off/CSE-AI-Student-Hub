import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { Loader2, ClipboardList, Users, Download, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { safeFormatDate } from "@/lib/utils";
import { format } from "date-fns";

interface FormField { id: string; label: string; type: string; required: boolean; options?: string[]; }
interface EventLite {
  id: string; title: string; date: string | null; event_type: "inside" | "outside" | null;
  form_schema: FormField[] | null;
}
interface Registration {
  id: string; user_id: string; event_id: string; created_at: string; answers: Record<string, any> | null;
  profiles: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
}

const EventRegistrations = ({ readOnly = false }: { readOnly?: boolean }) => {
  const [events, setEvents] = useState<EventLite[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingEvents(true);
      try {
        const q = query(collection(db, "events"), where("event_type", "==", "inside"), orderBy("created_at", "desc"));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          form_schema: d.data().form_schema ?? []
        })) as EventLite[];
        setEvents(list);
        if (list.length > 0) setSelectedId(list[0].id);
      } catch (err) {
        toast.error("Failed to load events");
      }
      setLoadingEvents(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) { setRegs([]); return; }
    (async () => {
      setLoadingRegs(true);
      try {
        const q = query(collection(db, "event_registrations"), where("event_id", "==", selectedId), orderBy("created_at", "desc"));
        const snapshot = await getDocs(q);
        const rawRegs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
        }));

        const userIds = [...new Set(rawRegs.map((r: any) => r.user_id).filter(Boolean))];
        const profilesMap: Record<string, any> = {};
        await Promise.all(userIds.map(async (uid) => {
          const pSnap = await getDoc(doc(db, "profiles", uid));
          if (pSnap.exists()) {
            profilesMap[uid] = pSnap.data();
          }
        }));

        const list = rawRegs.map((r: any) => ({
          ...r,
          profiles: profilesMap[r.user_id] || null
        })) as Registration[];
        setRegs(list);
      } catch (err) {
        toast.error("Failed to load registrations");
      }
      setLoadingRegs(false);
    })();
  }, [selectedId]);

  const selectedEvent = events.find((e) => e.id === selectedId);
  const fields = selectedEvent?.form_schema ?? [];

  const exportCsv = () => {
    if (!selectedEvent) return;
    const cols = ["Name", "Email", "Registered At", ...fields.map((f) => f.label)];
    const rows = regs.map((r) => [
      r.profiles?.full_name ?? "",
      r.profiles?.email ?? "",
      safeFormatDate(r.created_at, "yyyy-MM-dd HH:mm"),
      ...fields.map((f) => {
        const v = r.answers?.[f.id];
        return Array.isArray(v) ? v.join("; ") : (v ?? "");
      }),
    ]);
    const csv = [cols, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedEvent.title.replace(/\s+/g, "_")}_registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList size={20} className="text-primary" /> Event Registrations
          </h2>
          <p className="text-sm text-muted-foreground">View who signed up for inside events and their answers.</p>
        </div>
        {regs.length > 0 && (
          <Button onClick={exportCsv} variant="outline" size="sm" className="gap-2">
            <Download size={14} /> Export CSV
          </Button>
        )}
      </div>

      {loadingEvents ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-20 text-center text-sm text-muted-foreground">
          No inside events yet. Create one in the Events tab to start collecting registrations.
        </div>
      ) : (
        <>
          <div className="max-w-md">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Select an event…" /></SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title} {e.date ? `· ${e.date}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Registered" value={regs.length} icon={Users} />
            <Stat label="Questions" value={fields.length} icon={ClipboardList} />
            <Stat label="Event Date" value={selectedEvent?.date || "—"} icon={Calendar} />
          </div>

          {loadingRegs ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : regs.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl py-16 text-center text-sm text-muted-foreground">
              No one has registered yet.
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Member</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registered</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Answers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {regs.map((r) => (
                    <>
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-sm">{r.profiles?.full_name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{r.profiles?.email}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {safeFormatDate(r.created_at, "MMM d, yyyy · h:mm a")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {fields.length > 0 ? (
                            <button
                              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              {expanded === r.id ? "Hide" : "View"} {expanded === r.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                      {expanded === r.id && fields.length > 0 && (
                        <tr key={`${r.id}-detail`} className="bg-muted/20">
                          <td colSpan={3} className="px-4 py-4">
                            <dl className="grid md:grid-cols-2 gap-3">
                              {fields.map((f) => {
                                const v = r.answers?.[f.id];
                                return (
                                  <div key={f.id}>
                                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{f.label}</dt>
                                    <dd className="text-sm">{Array.isArray(v) ? v.join(", ") : (v?.toString() || <span className="text-muted-foreground italic">No answer</span>)}</dd>
                                  </div>
                                );
                              })}
                            </dl>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value, icon: Icon }: { label: string; value: any; icon: any }) => (
  <div className="border border-border rounded-lg p-3 bg-card flex items-center gap-3">
    <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Icon size={16} /></div>
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold truncate">{value}</p>
    </div>
  </div>
);

export default EventRegistrations;
