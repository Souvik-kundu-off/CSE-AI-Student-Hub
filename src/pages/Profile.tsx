import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ensureUrl, isValidGithubUrl, isValidLinkedinUrl, normalizeSocialUrl } from "@/lib/utils-url";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Loader2, 
  User, 
  BookOpen, 
  Hash, 
  Phone, 
  Mail, 
  Github, 
  Linkedin, 
  Edit3, 
  Save, 
  X,
  Trophy,
  Layout,
  Award,
  ExternalLink
} from "lucide-react";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  student_code: string;
  programme_name: string;
  phone_number: string;
  github_url: string;
  linkedin_url: string;
  points: number;
  projects_count: number;
  wins_count: number;
}

import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const navigate = useNavigate();
  const { profile: authProfile, loading: authLoading, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!authProfile) {
        navigate("/login");
      } else {
        setProfile(authProfile as unknown as ProfileData);
        setFormData(authProfile as unknown as ProfileData);
        setLoading(false);
      }
    }
  }, [authLoading, authProfile, navigate]);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        if (loading) setTimedOut(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading]);


  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.github_url && !isValidGithubUrl(formData.github_url)) {
      toast.error("Invalid GitHub URL. Example: github.com/username");
      return;
    }

    if (formData.linkedin_url && !isValidLinkedinUrl(formData.linkedin_url)) {
      toast.error("Invalid LinkedIn URL. Example: linkedin.com/in/username");
      return;
    }

    setSaving(true);

    const normalizedGithub = normalizeSocialUrl(formData.github_url);
    const normalizedLinkedin = normalizeSocialUrl(formData.linkedin_url);

    try {
      await updateDoc(doc(db, "profiles", profile!.id), {
        full_name: formData.full_name,
        student_code: formData.student_code,
        programme_name: formData.programme_name,
        phone_number: formData.phone_number,
        github_url: normalizedGithub,
        linkedin_url: normalizedLinkedin,
      });

      setProfile({ ...profile!, ...formData as ProfileData, github_url: normalizedGithub, linkedin_url: normalizedLinkedin });
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground animate-pulse font-medium">Loading Identity...</p>
        </div>
      </div>
    );
  }

  if (timedOut && !profile) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-40">
          <X size={48} className="text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Session Timeout</h1>
          <p className="text-muted-foreground text-sm">We couldn't synchronize your profile. Please check your connection.</p>
          <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
          
          {/* Left Column: Stats & Meta */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 mx-auto overflow-hidden flex items-center justify-center relative group">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-primary" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">{profile?.full_name}</h2>
                <p className="text-sm text-muted-foreground">{profile?.programme_name || "Club Member"}</p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                {profile?.github_url && (
                  <a href={ensureUrl(profile.github_url)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-accent hover:bg-primary/10 transition-colors">
                    <Github className="w-4 h-4" />
                  </a>
                )}
                {profile?.linkedin_url && (
                  <a href={ensureUrl(profile.linkedin_url)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-accent hover:bg-primary/10 transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{profile?.points}</p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium">Contr. Points</p>
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Layout className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{profile?.projects_count}</p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium">Projects</p>
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{profile?.wins_count}</p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium">Wins</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Details & Edit */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8 border-b border-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Edit3 className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Profile Details</h3>
                </div>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2 h-8 text-[13px]">
                    <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="h-8 text-[13px]">
                      <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
                    </Button>
                  </div>
                )}
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        disabled={!editing}
                        className="pl-9 h-10 bg-background"
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        disabled
                        className="pl-9 h-10 bg-accent/30 opacity-70"
                        value={profile?.email}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Student Code</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        disabled={!editing}
                        placeholder="e.g. CS2024001"
                        className="pl-9 h-10 bg-background"
                        value={formData.student_code}
                        onChange={e => setFormData({ ...formData, student_code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Programme</Label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        disabled={!editing}
                        placeholder="e.g. B.Tech Computer Science"
                        className="pl-9 h-10 bg-background"
                        value={formData.programme_name}
                        onChange={e => setFormData({ ...formData, programme_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        disabled={!editing}
                        className="pl-9 h-10 bg-background"
                        value={formData.phone_number}
                        onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      GitHub URL {profile?.github_url && <a href={ensureUrl(profile.github_url)} target="_blank" className="text-primary hover:underline lowercase tracking-normal flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" /> visit</a>}
                    </Label>
                    <div className="relative">
                      <Github className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        disabled={!editing}
                        placeholder="github.com/username"
                        className="pl-9 h-10 bg-background"
                        value={formData.github_url}
                        onChange={e => setFormData({ ...formData, github_url: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      LinkedIn URL {profile?.linkedin_url && <a href={ensureUrl(profile.linkedin_url)} target="_blank" className="text-primary hover:underline lowercase tracking-normal flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" /> visit</a>}
                    </Label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        disabled={!editing}
                        placeholder="linkedin.com/in/username"
                        className="pl-9 h-10 bg-background"
                        value={formData.linkedin_url}
                        onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {editing && (
                  <Button 
                    disabled={saving}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-[15px] rounded-xl transition-all active:scale-[0.98]"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Profile;
