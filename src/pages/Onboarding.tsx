import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, User, BookOpen, Hash, Phone, Mail, Github, Linkedin, CheckCircle2 } from "lucide-react";
import { isValidGithubUrl, isValidLinkedinUrl, normalizeSocialUrl } from "@/lib/utils-url";
import { useAuth } from "@/contexts/AuthContext";

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    student_code: "",
    programme_name: "",
    phone_number: "",
    github_url: "",
    linkedin_url: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }

    if (!authLoading && profile?.role === "admin") {
      navigate("/");
      return;
    }

    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email,
        full_name: profile?.full_name || user.displayName || prev.full_name,
      }));
    }
  }, [authLoading, user, profile, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.github_url && !isValidGithubUrl(formData.github_url)) {
      toast.error("Invalid GitHub URL. Example: github.com/username");
      return;
    }

    if (formData.linkedin_url && !isValidLinkedinUrl(formData.linkedin_url)) {
      toast.error("Invalid LinkedIn URL. Example: linkedin.com/in/username");
      return;
    }

    setSubmitting(true);

    try {
      if (!user) throw new Error("No user found");

      const normalizedGithub = normalizeSocialUrl(formData.github_url);
      const normalizedLinkedin = normalizeSocialUrl(formData.linkedin_url);

      const isFirstTime = !profile || profile.points === undefined || profile.points === 0;
      const initialPoints = isFirstTime ? 10 : profile.points;

      await setDoc(doc(db, "profiles", user.uid), {
        full_name: formData.full_name,
        email: user.email || "",
        avatar_url: user.photoURL || "",
        student_code: formData.student_code,
        programme_name: formData.programme_name,
        phone_number: formData.phone_number,
        github_url: normalizedGithub,
        linkedin_url: normalizedLinkedin,
        role: profile?.role || "member",
        points: initialPoints,
        projects_count: profile?.projects_count || 0,
        wins_count: profile?.wins_count || 0,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      if (isFirstTime) {
        await addDoc(collection(db, "points_history"), {
          user_id: user.uid,
          amount: 10,
          action_type: "WELCOME_BONUS",
          description: "Welcome bonus for completing Hub registration!",
          created_at: serverTimestamp()
        });
      }

      console.log("Onboarding: Profile saved to Firestore, refreshing...");
      await refreshProfile();
      
      // Add a small delay for state to permeate
      console.log("Onboarding: Refresh complete, navigating to dashboard...");
      toast.success("Profile completed successfully!");
      
      // Use setTimeout to allow context update to trigger re-renders before navigation
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 100);
    } catch (error: any) {
      console.error("Onboarding: Error saving profile", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-primary/5 blur-[120px] -z-10" />

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Complete your profile.</h1>
          <p className="text-muted-foreground">Welcome to CSE-AI Student Hub! Tell us a bit more about yourself to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-card border border-border rounded-3xl p-8 shadow-sm">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Essential Info */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Essential Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      required
                      placeholder="John Doe"
                      className="pl-9 h-10 bg-background border-border"
                      value={formData.full_name}
                      onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      disabled
                      placeholder="john@college.edu"
                      className="pl-9 h-10 bg-accent/50 border-border cursor-not-allowed opacity-70"
                      value={formData.email}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student_code" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Student Code</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="student_code"
                      required
                      placeholder="e.g. CS2024001"
                      className="pl-9 h-10 bg-background border-border"
                      value={formData.student_code}
                      onChange={e => setFormData({ ...formData, student_code: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programme" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Programme Name</Label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="programme"
                      required
                      placeholder="e.g. B.Tech Computer Science"
                      className="pl-9 h-10 bg-background border-border"
                      value={formData.programme_name}
                      onChange={e => setFormData({ ...formData, programme_name: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Social */}
            <div className="space-y-4 md:col-span-2 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                <Github className="w-4 h-4" /> Links & Contact
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      required
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="pl-9 h-10 bg-background border-border"
                      value={formData.phone_number}
                      onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">GitHub Profile (Optional)</Label>
                  <div className="relative">
                    <Github className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="github"
                      placeholder="github.com/username"
                      className="pl-9 h-10 bg-background border-border"
                      value={formData.github_url}
                      onChange={e => setFormData({ ...formData, github_url: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="linkedin" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">LinkedIn Profile (Optional)</Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="linkedin"
                      placeholder="linkedin.com/in/username"
                      className="pl-9 h-10 bg-background border-border"
                      value={formData.linkedin_url}
                      onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button 
            disabled={submitting}
            className="w-full h-11 text-[15px] bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all active:scale-[0.98]"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Complete Onboarding
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
