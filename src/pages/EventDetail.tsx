import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calendar, MapPin, Users, ExternalLink, Loader2, ArrowLeft, CheckCircle2, Globe, Layers,
  Phone, Mail, UserCircle,
} from "lucide-react";
import { toast } from "sonner";

interface FormField {
  id: string;
  label: string;
  type: "short_text" | "long_text" | "email" | "number" | "single_select" | "multi_select" | "checkbox";
  required: boolean;
  options?: string[];
}

interface Coordinator {
  name: string;
  phone: string;
  email: string;
}

interface EventRow {
  id: string; title: string; description: string | null;
  date: string | null; location: string | null; type: string | null;
  spots: number | null; mode: string | null; banner_url: string | null;
  external_url: string | null; event_type: "inside" | "outside" | null;
  form_schema: FormField[] | null; coordinators: Coordinator[] | null; is_upcoming: boolean;
}

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const docSnap = await getDoc(doc(db, "events", id));
      if (!docSnap.exists()) { toast.error("Event not found"); navigate("/events"); return; }
      const data = docSnap.data() as any;
      setEvent({ id: docSnap.id, ...data, form_schema: data.form_schema ?? [] });
      setLoading(false);
    })();
  }, [id, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const q = query(
        collection(db, "event_registrations"),
        where("event_id", "==", id),
        where("user_id", "==", user.uid)
      );
      const snap = await getDocs(q);
      setRegistered(!snap.empty);
    })();
  }, [user, id]);

  const fields = useMemo(() => event?.form_schema ?? [], [event]);

  const handleChange = (fid: string, value: any) =>
    setAnswers((a) => ({ ...a, [fid]: value }));

  const handleMultiToggle = (fid: string, opt: string) => {
    setAnswers((a) => {
      const cur: string[] = Array.isArray(a[fid]) ? a[fid] : [];
      return { ...a, [fid]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
    });
  };

  const submit = async () => {
    if (!user) { navigate("/login"); return; }
    if (!event) return;

    // validate required
    for (const f of fields) {
      const v = answers[f.id];
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (f.required && empty) {
        toast.error(`"${f.label}" is required`);
        return;
      }
      if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) {
        toast.error(`"${f.label}" must be a valid email`); return;
      }
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "event_registrations"), {
        event_id: event.id,
        user_id: user.uid,
        answers,
        created_at: serverTimestamp(),
      });
      toast.success("Registered successfully!");
      setRegistered(true);
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    }
    setSubmitting(false);
  };

  if (loading || authLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center py-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </PageLayout>
    );
  }
  if (!event) return null;

  return (
    <PageLayout>
      <section className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
        <button onClick={() => navigate("/events")} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-6">
          <ArrowLeft size={14} /> Back to Events
        </button>

        <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">
          {/* Left column — Event details */}
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                event.event_type === "inside" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {event.event_type === "inside" ? <Layers size={10} /> : <Globe size={10} />}
                {event.event_type === "inside" ? "Inside Event" : "Outside Event"}
              </span>
              {event.type && <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{event.type}</span>}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">{event.title}</h1>
            <p className="text-muted-foreground leading-relaxed mb-6">{event.description}</p>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {event.date || "To be discussed"}</span>
              {event.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {event.location}</span>}
              {event.spots != null && <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {event.spots} spots</span>}
            </div>

            {/* Event Info card */}
            <div className="border border-border rounded-xl p-4 bg-card space-y-3 mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Info</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 shrink-0 text-primary" />
                  <span>{event.date || "TBD"}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0 text-primary" />
                    <span>{event.location}</span>
                  </div>
                )}
                {event.spots != null && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4 shrink-0 text-primary" />
                    <span>{event.spots} spots</span>
                  </div>
                )}
                {event.mode && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {event.mode === "Online" ? <Globe className="w-4 h-4 shrink-0 text-primary" /> : <Layers className="w-4 h-4 shrink-0 text-primary" />}
                    <span>{event.mode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Outside */}
            {event.event_type === "outside" && (
              <div className="border border-border rounded-xl p-6 bg-card">
                <h2 className="font-semibold mb-2">Register externally</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  This event is hosted outside our platform. Click below to register on the host's site.
                </p>
                <a href={event.external_url || "#"} target="_blank" rel="noreferrer">
                  <Button className="gap-2"><ExternalLink size={14} /> Open Registration</Button>
                </a>
              </div>
            )}

            {/* Inside */}
            {event.event_type === "inside" && (
              <div className="border border-border rounded-xl p-6 bg-card">
                <h2 className="font-semibold mb-1">Register for this event</h2>
                <p className="text-sm text-muted-foreground mb-5">Fill out the form below to secure your spot.</p>

                {!user ? (
                  <div className="text-sm text-muted-foreground py-4">
                    Please <button onClick={() => navigate("/login")} className="text-primary underline">log in</button> to register.
                  </div>
                ) : registered ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
                    <CheckCircle2 size={16} /> You're registered for this event!
                  </div>
                ) : (
                  <div className="space-y-5">
                    {fields.map((f) => (
                      <div key={f.id} className="space-y-2">
                        <Label className="text-sm font-medium">
                          {f.label} {f.required && <span className="text-destructive">*</span>}
                        </Label>
                        {f.type === "short_text" && (
                          <Input value={answers[f.id] || ""} onChange={(e) => handleChange(f.id, e.target.value)} />
                        )}
                        {f.type === "long_text" && (
                          <Textarea value={answers[f.id] || ""} onChange={(e) => handleChange(f.id, e.target.value)} className="min-h-[100px]" />
                        )}
                        {f.type === "email" && (
                          <Input type="email" value={answers[f.id] || ""} onChange={(e) => handleChange(f.id, e.target.value)} />
                        )}
                        {f.type === "number" && (
                          <Input type="number" value={answers[f.id] ?? ""} onChange={(e) => handleChange(f.id, e.target.value === "" ? "" : Number(e.target.value))} />
                        )}
                        {f.type === "single_select" && (
                          <Select value={answers[f.id] || ""} onValueChange={(v) => handleChange(f.id, v)}>
                            <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                            <SelectContent>
                              {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        {f.type === "multi_select" && (
                          <div className="space-y-2">
                            {(f.options ?? []).map((o) => {
                              const checked = Array.isArray(answers[f.id]) && answers[f.id].includes(o);
                              return (
                                <div key={o} className="flex items-center gap-2">
                                  <Checkbox checked={checked} onCheckedChange={() => handleMultiToggle(f.id, o)} id={`${f.id}-${o}`} />
                                  <Label htmlFor={`${f.id}-${o}`} className="text-sm font-normal">{o}</Label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {f.type === "checkbox" && (
                          <div className="flex items-center gap-2">
                            <Checkbox checked={!!answers[f.id]} onCheckedChange={(v) => handleChange(f.id, !!v)} id={f.id} />
                            <Label htmlFor={f.id} className="text-sm font-normal">Yes</Label>
                          </div>
                        )}
                      </div>
                    ))}

                    <Button onClick={submit} disabled={submitting} className="w-full gap-2 mt-4">
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Submit Registration
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Coordinators */}
            {event.coordinators && event.coordinators.length > 0 && (
              <div className="border border-border rounded-xl p-5 bg-card mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <UserCircle size={14} className="text-primary" /> Event Coordinators
                </h3>
                <div className="space-y-3">
                  {event.coordinators.map((c, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-3 rounded-lg bg-muted/40">
                      <span className="font-medium text-sm">{c.name}</span>
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Phone size={12} /> {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Mail size={12} /> {c.email}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Banner image (sticky) */}
          <div className="lg:sticky lg:top-24">
            {event.banner_url ? (
              <div className="rounded-xl overflow-hidden border border-border bg-muted">
                <img
                  src={event.banner_url}
                  alt={event.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card flex items-center justify-center aspect-[4/3]">
                <div className="text-center text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No banner available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default EventDetail;
