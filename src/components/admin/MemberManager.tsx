import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Users, Search, Trophy, Shield, ShieldCheck, PlusCircle, MinusCircle,
  Loader2, ExternalLink, Mail, MoreVertical, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Member {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  role: string;
  points: number;
  programme_name: string;
  created_at: string;
}

const ROLE_FILTER_OPTIONS = [
  { value: "all",            label: "All Roles" },
  { value: "member",         label: "Members" },
  { value: "faculty",        label: "Faculty" },
  { value: "event_manager",  label: "Event Managers" },
  { value: "content_editor", label: "Content Editors" },
  { value: "moderator",      label: "Moderators" },
  { value: "admin",          label: "Admins" },
  { value: "superadmin",     label: "Super Admins" },
  { value: "guest",          label: "Guests" },
];

const ROLE_BADGE: Record<string, string> = {
  superadmin:     "bg-red-500/10 text-red-500",
  admin:          "bg-primary/10 text-primary",
  faculty:        "bg-blue-500/10 text-blue-500",
  event_manager:  "bg-purple-500/10 text-purple-500",
  content_editor: "bg-emerald-500/10 text-emerald-500",
  moderator:      "bg-amber-500/10 text-amber-500",
  member:         "bg-white/5 text-muted-foreground",
  guest:          "bg-white/5 text-muted-foreground",
};

const ROLE_LABEL: Record<string, string> = {
  superadmin:     "Super Admin",
  admin:          "Admin",
  faculty:        "Faculty",
  event_manager:  "Event Mgr",
  content_editor: "Editor",
  moderator:      "Moderator",
  member:         "Member",
  guest:          "Guest",
};

const MemberManager = ({ readonly = false, canManageRoles = false }: { readonly?: boolean; canManageRoles?: boolean }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPointsAmount, setBulkPointsAmount] = useState(10);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "profiles"), orderBy("points", "desc"));
      const snapshot = await getDocs(q);
      setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Member[]);
    } catch (err) {
      toast.error("Failed to load directory");
    }
    setLoading(false);
  };

  const handlePointAdjustment = async (memberId: string, amount: number) => {
    setProcessing(memberId);
    
    try {
      const currentPoints = members.find(m => m.id === memberId)?.points || 0;
      await updateDoc(doc(db, "profiles", memberId), { points: currentPoints + amount });

      await addDoc(collection(db, "points_history"), {
        user_id: memberId,
        amount: amount,
        action_type: "ADMIN_ADJUSTMENT",
        description: `Manual adjustment by Staff: ${amount > 0 ? '+' : ''}${amount} pts`,
        created_at: serverTimestamp()
      });

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, points: m.points + amount } : m));
      toast.success(`Credits adjusted: ${amount > 0 ? '+' : ''}${amount}`);
    } catch (err) {
      toast.error("Point update failed");
    }
    setProcessing(null);
  };

  const toggleRole = async (memberId: string, currentRole: string) => {
    if (!confirm(`Promote this member to ${currentRole === 'admin' ? 'Member' : 'Admin'}?`)) return;
    
    setProcessing(memberId);
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    
    try {
      await updateDoc(doc(db, "profiles", memberId), { role: newRole });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      toast.success(`Access updated to ${newRole}`);
    } catch (err) {
      toast.error("Role update failed");
    }
    setProcessing(null);
  };

  const filtered = members.filter(m =>
    (roleFilter === "all" || m.role === roleFilter) &&
    (m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     m.email?.toLowerCase().includes(search.toLowerCase()) ||
     m.programme_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(m => m.id)));
    }
  };

  const bulkAwardPoints = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Award ${bulkPointsAmount} points to ${selectedIds.size} selected members?`)) return;
    setProcessing("bulk");

    try {
      for (const memberId of selectedIds) {
        const member = members.find(m => m.id === memberId);
        if (!member) continue;

        await updateDoc(doc(db, "profiles", memberId), { points: member.points + bulkPointsAmount });

        await addDoc(collection(db, "points_history"), {
          user_id: memberId,
          amount: bulkPointsAmount,
          action_type: "ADMIN_BULK_ADJUSTMENT",
          description: `Bulk award by Overseer: +${bulkPointsAmount} pts`,
          created_at: serverTimestamp()
        });
      }

      setMembers(prev => prev.map(m => 
        selectedIds.has(m.id) ? { ...m, points: m.points + bulkPointsAmount } : m
      ));
      toast.success(`Awarded ${bulkPointsAmount} pts to ${selectedIds.size} members`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error("Bulk award failed");
    }
    setProcessing(null);
  };

  const bulkEmail = () => {
    if (selectedIds.size === 0) return;
    const emails = members.filter(m => selectedIds.has(m.id)).map(m => m.email).join(",");
    window.open(`mailto:${emails}`);
  };

  const bulkChangeRole = async (newRole: string) => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Change ${selectedIds.size} members to ${newRole}?`)) return;
    setProcessing("bulk");

    try {
      for (const memberId of selectedIds) {
        await updateDoc(doc(db, "profiles", memberId), { role: newRole });
      }

      setMembers(prev => prev.map(m => selectedIds.has(m.id) ? { ...m, role: newRole } : m));
      toast.success(`${selectedIds.size} members updated to ${newRole}`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error("Bulk role change failed");
    }
    setProcessing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users size={20} className="text-primary" /> Member Directory
          </h2>
          <p className="text-sm text-muted-foreground">Manage roles, audit contributions, and award credits.</p>
        </div>
        {/* Search + Role Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, or dept..."
            className="pl-9 bg-card border-white/10 rounded-xl"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setSelectedIds(new Set()); }}>
            <SelectTrigger className="bg-card border-white/10 rounded-xl w-[160px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      </div>

      {/* Bulk Actions Bar — write-only */}
      {selectedIds.size > 0 && !readonly && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-primary">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Input 
              type="number" 
              value={bulkPointsAmount} 
              onChange={e => setBulkPointsAmount(parseInt(e.target.value) || 0)}
              className="w-20 h-8 text-xs bg-black/20 border-white/10 rounded-lg"
            />
            <Button size="sm" onClick={bulkAwardPoints} disabled={processing === "bulk"} className="h-8 rounded-lg text-xs gap-1">
              <Trophy size={12} /> Award Points
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={bulkEmail} className="h-8 rounded-lg text-xs gap-1">
            <Mail size={12} /> Group Email
          </Button>
          {canManageRoles && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs gap-1">
                <Shield size={12} /> Change Role
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => bulkChangeRole("member")}>Set to Member</DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkChangeRole("faculty")}>Set to Faculty</DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkChangeRole("event_manager")}>Set to Event Manager</DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkChangeRole("content_editor")}>Set to Content Editor</DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkChangeRole("moderator")}>Set to Moderator</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => bulkChangeRole("admin")}>Set to Admin</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="h-8 rounded-lg text-xs text-muted-foreground ml-auto">
            Clear
          </Button>
        </div>
      )}

      <div className="bg-card/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 bg-transparent accent-primary"
                  />
                </th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Member</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Programme</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Hub Credits</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="p-20 text-center"><Loader2 className="animate-spin inline text-primary" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-20 text-center text-muted-foreground text-sm">No members matching your search.</td></tr>
              ) : (
                filtered.map(member => (
                  <tr key={member.id} className={`hover:bg-white/5 transition-colors group ${selectedIds.has(member.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-4 w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(member.id)}
                        onChange={() => toggleSelect(member.id)}
                        className="rounded border-white/20 bg-transparent accent-primary"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-white/10">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="text-[10px] font-bold">{member.full_name?.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold truncate max-w-[150px]">{member.full_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[11px] font-medium text-muted-foreground">{member.programme_name || "CSE-AI Member"}</span>
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${ROLE_BADGE[member.role] || "bg-white/5 text-muted-foreground"}`}>
                        {member.role === 'admin' || member.role === 'superadmin' ? <ShieldCheck size={10} /> : <Shield size={10} />}
                        {ROLE_LABEL[member.role] || member.role}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {!readonly && (
                          <button 
                            onClick={() => handlePointAdjustment(member.id, -10)}
                            disabled={processing === member.id}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          ><MinusCircle size={16} /></button>
                        )}
                        <span className="text-sm font-black tabular-nums min-w-[30px]">{member.points}</span>
                        {!readonly && (
                          <button 
                            onClick={() => handlePointAdjustment(member.id, 10)}
                            disabled={processing === member.id}
                            className="text-primary hover:scale-110 transition-all"
                          ><PlusCircle size={16} /></button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                    {!readonly && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => window.open(`mailto:${member.email}`)} className="gap-2">
                             <Mail size={14} /> Send Email
                          </DropdownMenuItem>
                          {canManageRoles && (
                          <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Change Role</DropdownMenuLabel>
                          {(["member","faculty","event_manager","content_editor","moderator","admin","superadmin"] as const).filter(r => r !== member.role).map(r => (
                            <DropdownMenuItem key={r} onClick={async () => {
                              if (!confirm(`Change ${member.full_name} to ${r}?`)) return;
                              try {
                                await updateDoc(doc(db, "profiles", member.id), { role: r });
                                setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: r } : m));
                                toast.success(`Role updated to ${r}`);
                              } catch (err) {
                                toast.error("Role update failed");
                              }
                            }} className="gap-2 capitalize">
                              <Shield size={14} /> Set as {r.replace("_", " ")}
                            </DropdownMenuItem>
                          ))}
                          </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MemberManager;
