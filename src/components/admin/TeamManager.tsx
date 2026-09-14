import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import {
  Users, Plus, Trash2, Loader2, Edit3, X,
  Github, Linkedin, Twitter, GraduationCap, Crown, Search, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { logAdminAction } from "./AuditLog";

interface TeamMember {
  id: string;
  full_name: string;
  role: string;
  department: string;
  avatar_url: string;
  github_url: string;
  linkedin_url: string;
  twitter_url: string;
  is_faculty: boolean;
  sort_order: number;
  profile_id?: string; // link to profiles table
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  programme_name: string;
  email: string;
}

const emptyForm = {
  profile_id: "",
  role: "",
  department: "",
  github_url: "",
  linkedin_url: "",
  twitter_url: "",
  is_faculty: false,
  sort_order: 0,
};

// ── TeamManager accepts readonly + canManageTeam ──────────────────────────────
const TeamManager = ({
  readonly = false,
  canManageTeam = false,
}: {
  readonly?: boolean;
  canManageTeam?: boolean;
}) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");

  // Selected profile info (from profiles table)
  const selectedProfile = profiles.find(p => p.id === form.profile_id);

  useEffect(() => {
    fetchMembers();
    fetchProfiles();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "team_members"), orderBy("sort_order", "asc"));
      const snapshot = await getDocs(q);
      setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TeamMember[]);
    } catch (err) {
      toast.error("Failed to load team");
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    try {
      const q = query(collection(db, "profiles"), orderBy("full_name", "asc"));
      const snapshot = await getDocs(q);
      setProfiles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Profile[]);
    } catch (err) {
      console.error("Failed to fetch profiles for team manager", err);
    }
  };

  const startEdit = (m: TeamMember) => {
    setEditing(m.id);
    setCreating(false);
    setForm({
      profile_id: m.profile_id || "",
      role: m.role || "",
      department: m.department || "",
      github_url: m.github_url || "",
      linkedin_url: m.linkedin_url || "",
      twitter_url: m.twitter_url || "",
      is_faculty: m.is_faculty,
      sort_order: m.sort_order || 0,
    });
  };

  const cancel = () => { setEditing(null); setCreating(false); setForm(emptyForm); setProfileSearch(""); };

  const save = async () => {
    if (!form.role.trim()) { toast.error("Role/Title is required"); return; }
    setSaving(true);

    try {
      const profile = profiles.find(p => p.id === form.profile_id);
      const saveData = {
        profile_id: form.profile_id || null,
        full_name: profile?.full_name || "Unknown",
        avatar_url: profile?.avatar_url || "",
        department: form.department || profile?.programme_name || "",
        role: form.role,
        github_url: form.github_url,
        linkedin_url: form.linkedin_url,
        twitter_url: form.twitter_url,
        is_faculty: form.is_faculty,
        sort_order: editing ? form.sort_order : members.length,
      };

      if (editing) {
        await updateDoc(doc(db, "team_members", editing), saveData);
      } else {
        await addDoc(collection(db, "team_members"), saveData);
      }

      toast.success(editing ? "Team member updated" : "Team member added!");
      await logAdminAction({
        actionType: editing ? "UPDATE" : "CREATE",
        targetType: "TEAM",
        targetId: editing || "",
        targetLabel: saveData.full_name,
        details: `${form.is_faculty ? "Faculty" : "Core Team"} — ${form.role}`,
      });
      cancel();
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Failed to save team member");
    }
    setSaving(false);
  };

  const remove = async (m: TeamMember) => {
    if (!confirm(`Remove ${m.full_name} from the team page?`)) return;
    try {
      await deleteDoc(doc(db, "team_members", m.id));
      setMembers(prev => prev.filter(x => x.id !== m.id));
      toast.success("Removed from team");
      await logAdminAction({
        actionType: "DELETE", targetType: "TEAM",
        targetId: m.id, targetLabel: m.full_name, details: "Removed from team page",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  const showForm = creating || editing !== null;
  const coreTeam = members.filter(m => !m.is_faculty);
  const faculty = members.filter(m => m.is_faculty);

  // Filter profiles for the picker, exclude already-added members
  const addedProfileIds = new Set(members.map(m => m.profile_id).filter(Boolean));
  const filteredProfiles = profiles.filter(p =>
    !addedProfileIds.has(p.id) || p.id === form.profile_id
  ).filter(p =>
    !profileSearch || p.full_name?.toLowerCase().includes(profileSearch.toLowerCase())
    || p.email?.toLowerCase().includes(profileSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users size={20} className="text-primary" /> Team Manager
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage who appears on the public team page. {coreTeam.length} core, {faculty.length} faculty.
          </p>
        </div>
        {!showForm && canManageTeam && (
          <Button onClick={() => { setCreating(true); setForm(emptyForm); }} className="gap-2">
            <Plus size={16} /> Add Member
          </Button>
        )}
      </div>

      {/* Add / Edit form — only for admin/superadmin */}
      <AnimatePresence>
        {showForm && canManageTeam && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-white/10 rounded-[24px] p-6 bg-card space-y-5 shadow-2xl shadow-primary/5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <UserPlus size={16} className="text-primary" />
                {editing ? "Edit Team Member" : "Add Member from Directory"}
              </h3>
              <button onClick={cancel} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>

            {/* Profile picker */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Select Member Profile
              </label>

              {/* Selected profile preview */}
              {selectedProfile ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                  <Avatar className="h-10 w-10 border border-primary/20">
                    <AvatarImage src={selectedProfile.avatar_url} />
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {selectedProfile.full_name?.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{selectedProfile.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedProfile.programme_name || selectedProfile.email}</p>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, profile_id: "" })}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email…"
                      value={profileSearch}
                      onChange={e => setProfileSearch(e.target.value)}
                      className="pl-9 bg-black/20 border-white/10 rounded-xl"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-white/10 rounded-xl p-2 bg-black/10">
                    {filteredProfiles.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No members found</p>
                    ) : filteredProfiles.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setForm({ ...form, profile_id: p.id, department: p.programme_name || "" }); setProfileSearch(""); }}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={p.avatar_url} />
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                            {p.full_name?.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.full_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{p.programme_name || p.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Role, Department, Socials */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Role / Title</label>
                <Input
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  placeholder="e.g. President, Dev Lead, Faculty Advisor"
                  className="bg-black/20 border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Department (override)</label>
                <Input
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  placeholder="Auto-filled from profile, or override"
                  className="bg-black/20 border-white/10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1"><Github size={10} /> GitHub</label>
                <Input value={form.github_url} onChange={e => setForm({ ...form, github_url: e.target.value })} placeholder="https://github.com/..." className="bg-black/20 border-white/10 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1"><Linkedin size={10} /> LinkedIn</label>
                <Input value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." className="bg-black/20 border-white/10 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1"><Twitter size={10} /> Twitter</label>
                <Input value={form.twitter_url} onChange={e => setForm({ ...form, twitter_url: e.target.value })} placeholder="https://twitter.com/..." className="bg-black/20 border-white/10 rounded-xl" />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent">
              <Switch checked={form.is_faculty} onCheckedChange={v => setForm({ ...form, is_faculty: v })} />
              <Label className="text-sm">{form.is_faculty ? "Faculty / Advisor" : "Core Team Member"}</Label>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button onClick={save} disabled={saving || !form.role.trim()} className="flex-1 gap-2 rounded-xl">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Update Member" : "Add to Team"}
              </Button>
              <Button variant="outline" onClick={cancel} className="rounded-xl">Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team List */}
      {!showForm && (
        loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : members.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-[24px] py-20 text-center text-sm text-muted-foreground">
            No team members added yet.
          </div>
        ) : (
          <div className="space-y-6">
            {coreTeam.length > 0 && (
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                  <Crown size={14} className="text-primary" /> Core Team ({coreTeam.length})
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {coreTeam.map(m => (
                    <TeamCard
                      key={m.id}
                      member={m}
                      canManageTeam={canManageTeam}
                      onEdit={() => startEdit(m)}
                      onRemove={() => remove(m)}
                    />
                  ))}
                </div>
              </div>
            )}
            {faculty.length > 0 && (
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                  <GraduationCap size={14} className="text-primary" /> Faculty ({faculty.length})
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {faculty.map(m => (
                    <TeamCard
                      key={m.id}
                      member={m}
                      canManageTeam={canManageTeam}
                      onEdit={() => startEdit(m)}
                      onRemove={() => remove(m)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

const TeamCard = ({
  member, canManageTeam, onEdit, onRemove,
}: {
  member: TeamMember;
  canManageTeam: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) => (
  <div className="bg-card/50 border border-white/5 rounded-2xl p-5 group hover:border-primary/20 transition-all relative">
    <div className="flex items-start gap-3">
      <Avatar className="w-11 h-11 rounded-xl border border-white/10 shrink-0">
        <AvatarImage src={member.avatar_url} className="object-cover" />
        <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-[11px] font-bold">
          {member.full_name?.split(" ").map(w => w[0]).join("")}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <h4 className="font-bold text-sm truncate">{member.full_name}</h4>
        <p className="text-[11px] text-primary font-medium">{member.role}</p>
        <p className="text-[10px] text-muted-foreground">{member.department}</p>
        <div className="flex gap-2 mt-2">
          {member.github_url && <Github size={12} className="text-muted-foreground" />}
          {member.linkedin_url && <Linkedin size={12} className="text-muted-foreground" />}
          {member.twitter_url && <Twitter size={12} className="text-muted-foreground" />}
        </div>
      </div>
    </div>
    {canManageTeam && (
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
          <Edit3 size={12} />
        </button>
        <button onClick={onRemove} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    )}
  </div>
);

export default TeamManager;
