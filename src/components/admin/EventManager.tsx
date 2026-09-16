import { useEffect, useState } from "react";
import ImageUpload from "@/components/ui/ImageUpload";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Calendar, Plus, Trash2, Edit3, Loader2, MapPin, Users, X, ExternalLink,
  GripVertical, ListChecks, Globe, Layers, Phone, Mail, UserCircle,
} from "lucide-react";

type FieldType = "short_text" | "long_text" | "email" | "number" | "single_select" | "multi_select" | "checkbox";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[]; // for select-type fields
}

interface Coordinator {
  name: string;
  phone: string;
  email: string;
}

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  location: string | null;
  type: string | null;
  spots: number | null;
  mode: string | null;
  banner_url: string | null;
  register_url: string | null;
  external_url: string | null;
  event_type: "inside" | "outside" | null;
  form_schema: FormField[] | null;
  coordinators: Coordinator[] | null;
  is_upcoming: boolean;
  created_at: string;
}

const empty = {
  title: "", description: "", date: "", location: "",
  type: "Workshop", spots: 50, mode: "Offline",
  banner_url: "", register_url: "", external_url: "",
  event_type: "outside" as "inside" | "outside",
  form_schema: [] as FormField[],
  coordinators: [] as Coordinator[],
  is_upcoming: true,
};

const FIELD_TYPES: { value: FieldType; label: string; hasOptions: boolean }[] = [
  { value: "short_text", label: "Short text", hasOptions: false },
  { value: "long_text", label: "Long text", hasOptions: false },
  { value: "email", label: "Email", hasOptions: false },
  { value: "number", label: "Number", hasOptions: false },
  { value: "single_select", label: "Single choice", hasOptions: true },
  { value: "multi_select", label: "Multiple choice", hasOptions: true },
  { value: "checkbox", label: "Checkbox (yes/no)", hasOptions: false },
];

const newField = (): FormField => ({
  id: crypto.randomUUID(),
  type: "short_text",
  label: "Untitled question",
  required: false,
});

const EventManager = ({ readOnly = false }: { readOnly?: boolean }) => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "events"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        created_at: d.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as EventRow[];
      setEvents(list.map((e) => ({ ...e, form_schema: e.form_schema ?? [] })));
    } catch (err: any) {
      toast.error("Failed to load events");
    }
    setLoading(false);
  };

  const startEdit = (e: EventRow) => {
    setEditing(e.id); setCreating(false);
    setForm({
      title: e.title || "", description: e.description || "", date: e.date || "",
      location: e.location || "", type: e.type || "Workshop", spots: e.spots || 0,
      mode: e.mode || "Offline", banner_url: e.banner_url || "",
      register_url: e.register_url || "", external_url: e.external_url || "",
      event_type: (e.event_type as any) || "outside",
      form_schema: Array.isArray(e.form_schema) ? e.form_schema : [],
      coordinators: Array.isArray(e.coordinators) ? e.coordinators : [],
      is_upcoming: e.is_upcoming,
    });
  };

  const cancel = () => { setEditing(null); setCreating(false); setForm(empty); };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.banner_url.trim()) { toast.error("Please upload an event banner image"); return; }
    if (form.event_type === "outside" && !form.external_url.trim()) {
      toast.error("Outside events need an external registration link");
      return;
    }
    if (form.event_type === "inside" && form.form_schema.length === 0) {
      if (!confirm("This inside event has no registration questions. Members will only submit their identity. Continue?")) return;
    }
    setSaving(true);
    try {
      const payload = { ...form, form_schema: form.form_schema as any };
      if (editing) {
        await updateDoc(doc(db, "events", editing), payload);
      } else {
        await addDoc(collection(db, "events"), {
          ...payload,
          created_at: serverTimestamp(),
        });
      }
      toast.success(editing ? "Event updated" : "Event created");
      cancel(); fetchEvents();
    } catch (err: any) {
      toast.error(err.message || "Failed to save event");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this event permanently?")) return;
    try {
      await deleteDoc(doc(db, "events", id));
      toast.success("Deleted"); setEvents((e) => e.filter((x) => x.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  // ---- form builder helpers ----
  const addField = () => setForm((f) => ({ ...f, form_schema: [...f.form_schema, newField()] }));
  const updateField = (id: string, patch: Partial<FormField>) =>
    setForm((f) => ({
      ...f,
      form_schema: f.form_schema.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
  const removeField = (id: string) =>
    setForm((f) => ({ ...f, form_schema: f.form_schema.filter((q) => q.id !== id) }));
  const moveField = (id: string, dir: -1 | 1) =>
    setForm((f) => {
      const i = f.form_schema.findIndex((q) => q.id === id);
      if (i < 0) return f;
      const j = i + dir;
      if (j < 0 || j >= f.form_schema.length) return f;
      const next = [...f.form_schema];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, form_schema: next };
    });

  const showForm = (creating || editing !== null) && !readOnly;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar size={20} className="text-primary" /> Event Manager
          </h2>
          <p className="text-sm text-muted-foreground">Outside events link out. Inside events use the built-in registration form.</p>
        </div>
        {!showForm && !readOnly && (
          <Button onClick={() => { setCreating(true); setForm(empty); }} className="gap-2">
            <Plus size={16} /> New Event
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border border-border rounded-xl p-6 bg-card space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editing ? "Edit Event" : "Create Event"}</h3>
            <button onClick={cancel} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>

          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setForm({ ...form, event_type: "outside" })}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
                form.event_type === "outside" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              <Globe size={14} /> Outside Event
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, event_type: "inside" })}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
                form.event_type === "inside" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              <Layers size={14} /> Inside Event
            </button>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {form.event_type === "outside"
              ? "Hosted on an external platform — members go offsite to register."
              : "Hosted by us — registrations and answers stay on this dashboard."}
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Title">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Type">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Hackathon", "Workshop", "Competition", "Gaming", "Meetup", "Talk"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date">
              <Input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="e.g. Mar 15, 2025" />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Hall A or Online" />
            </Field>
            <Field label="Mode">
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Offline">Offline</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Spots Available">
              <Input type="number" value={form.spots} onChange={(e) => setForm({ ...form, spots: parseInt(e.target.value) || 0 })} />
            </Field>
            <div className="md:col-span-2">
              <ImageUpload
                label="Event Banner"
                folder="tech-hub/events"
                currentUrl={form.banner_url || undefined}
                onUpload={(url) => setForm({ ...form, banner_url: url })}
                onClear={() => setForm({ ...form, banner_url: "" })}
                maxSizeMB={5}
              />
            </div>
            {form.event_type === "outside" && (
              <Field label="External Registration Link *">
                <Input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="https://example.com/event-registration" />
              </Field>
            )}
          </div>

          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[100px]" />
          </Field>

          {/* Coordinators */}
          <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle size={16} className="text-primary" />
                <h4 className="font-semibold text-sm">Event Coordinators</h4>
                <span className="text-[10px] text-muted-foreground">(max 3)</span>
              </div>
              {form.coordinators.length < 3 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setForm({ ...form, coordinators: [...form.coordinators, { name: "", phone: "", email: "" }] })}
                  className="gap-1.5 h-8"
                >
                  <Plus size={14} /> Add
                </Button>
              )}
            </div>

            {form.coordinators.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No coordinators added yet. Add contact persons for this event.
              </p>
            ) : (
              <div className="space-y-3">
                {form.coordinators.map((c, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-3 bg-card space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Coordinator {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, coordinators: form.coordinators.filter((_, i) => i !== idx) })}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <Input
                        value={c.name}
                        onChange={(e) => {
                          const updated = [...form.coordinators];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setForm({ ...form, coordinators: updated });
                        }}
                        placeholder="Name"
                        className="h-9"
                      />
                      <Input
                        value={c.phone}
                        onChange={(e) => {
                          const updated = [...form.coordinators];
                          updated[idx] = { ...updated[idx], phone: e.target.value };
                          setForm({ ...form, coordinators: updated });
                        }}
                        placeholder="Phone number"
                        className="h-9"
                      />
                      <Input
                        type="email"
                        value={c.email}
                        onChange={(e) => {
                          const updated = [...form.coordinators];
                          updated[idx] = { ...updated[idx], email: e.target.value };
                          setForm({ ...form, coordinators: updated });
                        }}
                        placeholder="Email"
                        className="h-9"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INSIDE event: form builder */}
          {form.event_type === "inside" && (
            <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks size={16} className="text-primary" />
                  <h4 className="font-semibold text-sm">Registration Form Builder</h4>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addField} className="gap-1.5 h-8">
                  <Plus size={14} /> Add Question
                </Button>
              </div>

              {form.form_schema.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No questions yet. Members will only register with their account info.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.form_schema.map((q, idx) => {
                    const meta = FIELD_TYPES.find((t) => t.value === q.type)!;
                    return (
                      <div key={q.id} className="border border-border rounded-lg p-3 bg-card space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col gap-0.5 mt-1">
                            <button type="button" onClick={() => moveField(q.id, -1)} className="text-muted-foreground hover:text-foreground text-[10px]">▲</button>
                            <button type="button" onClick={() => moveField(q.id, 1)} className="text-muted-foreground hover:text-foreground text-[10px]">▼</button>
                          </div>
                          <div className="flex-1 grid md:grid-cols-[1fr_180px] gap-2">
                            <Input
                              value={q.label}
                              onChange={(e) => updateField(q.id, { label: e.target.value })}
                              placeholder="Question label"
                              className="h-9"
                            />
                            <Select value={q.type} onValueChange={(v) => updateField(q.id, { type: v as FieldType, options: FIELD_TYPES.find(t=>t.value===v)?.hasOptions ? (q.options ?? ["Option 1"]) : undefined })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeField(q.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {meta.hasOptions && (
                          <div className="pl-7">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Options (one per line)</Label>
                            <Textarea
                              value={(q.options ?? []).join("\n")}
                              onChange={(e) => updateField(q.id, { options: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                              className="min-h-[70px] text-xs mt-1"
                              placeholder="Option 1&#10;Option 2"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2 pl-7">
                          <Switch
                            checked={q.required}
                            onCheckedChange={(v) => updateField(q.id, { required: !!v })}
                            id={`req-${q.id}`}
                          />
                          <Label htmlFor={`req-${q.id}`} className="text-xs">Required</Label>
                          <span className="text-[10px] text-muted-foreground ml-auto">#{idx + 1}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-md bg-accent">
            <Switch checked={form.is_upcoming} onCheckedChange={(v) => setForm({ ...form, is_upcoming: v })} />
            <Label className="text-sm">Upcoming Event (shows in upcoming tab)</Label>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <Button onClick={save} disabled={saving} className="flex-1 gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Update Event" : "Publish Event"}
            </Button>
            <Button variant="outline" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-20 text-center text-sm text-muted-foreground">
          No events created yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {events.map((e) => (
            <div key={e.id} className="border border-border rounded-lg p-4 bg-card group">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      e.event_type === "inside" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {e.event_type === "inside" ? "Inside" : "Outside"}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-primary">{e.type}</span>
                    {!e.is_upcoming && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">· Past</span>}
                  </div>
                  <h4 className="font-semibold text-sm truncate">{e.title}</h4>
                </div>
                {!readOnly && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(e)} className="p-1.5 rounded hover:bg-accent"><Edit3 size={13} /></button>
                    <button onClick={() => remove(e.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{e.description}</p>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {e.date && <span className="flex items-center gap-1"><Calendar size={11} /> {e.date}</span>}
                {e.location && <span className="flex items-center gap-1"><MapPin size={11} /> {e.location}</span>}
                {e.spots != null && <span className="flex items-center gap-1"><Users size={11} /> {e.spots}</span>}
                {e.event_type === "outside" && e.external_url && (
                  <a href={e.external_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink size={11} /> Link
                  </a>
                )}
                {e.event_type === "inside" && (
                  <span className="flex items-center gap-1"><ListChecks size={11} /> {(e.form_schema ?? []).length} questions</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default EventManager;
