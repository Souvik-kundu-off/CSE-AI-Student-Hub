import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, Save, Send, Github, Globe, Image as ImageIcon, X, Plus, ArrowLeft,
  Video, Info, ExternalLink, Play, HelpCircle,
} from "lucide-react";
import { z } from "zod";
import { isValidGithubUrl, normalizeSocialUrl } from "@/lib/utils-url";
import { isValidYouTubeUrl } from "@/lib/youtube-utils";
import ImageMultiUpload from "@/components/ui/ImageMultiUpload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

const projectSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().trim().min(20, "Describe your project in detail").max(5000),
  category: z.string().min(1, "Pick a category"),
  github_url: z.string().trim().url("Invalid URL").max(300).optional().or(z.literal("")),
  live_url: z.string().trim().url("Invalid URL").max(300).optional().or(z.literal("")),
  youtube_url: z.string().trim().max(300).optional().or(z.literal("")),
});

const categories = ["AI", "Web", "App", "Hardware", "Game", "Other"];

const SubmitProject = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    github_url: "",
    live_url: "",
    youtube_url: "",
  });
  const [stack, setStack] = useState<string[]>([]);
  const [stackInput, setStackInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [team, setTeam] = useState<string[]>([]);
  const [teamInput, setTeamInput] = useState("");
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (!isEdit || !user) return;
    (async () => {
      const docSnap = await getDoc(doc(db, "projects", id!));
      if (!docSnap.exists()) {
        toast.error("Project not found");
        navigate("/my-projects");
        return;
      }
      const data = docSnap.data() as any;
      if (data.author_id !== user.uid) {
        toast.error("Not your project");
        navigate("/my-projects");
        return;
      }
      setForm({
        title: data.title || "",
        description: data.description || "",
        category: data.category || "",
        github_url: data.github_url || "",
        live_url: data.live_url || "",
        youtube_url: data.youtube_url || "",
      });
      setStack(data.stack || []);
      setTags(data.tags || []);
      setTeam(data.team_members || []);
      setImages(data.images || []);
      setLoading(false);
    })();
  }, [id, user, isEdit, navigate]);

  const addChip = (
    val: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void
  ) => {
    const v = val.trim();
    if (!v || list.includes(v) || list.length >= 15) return;
    setList([...list, v]);
    setInput("");
  };

  const removeChip = (i: number, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter((_, idx) => idx !== i));
  };

  const save = async (status: "draft" | "pending") => {
    if (!user || !profile) return;
    if (status === "pending") {
      const result = projectSchema.safeParse(form);
      if (!result.success) {
        toast.error(result.error.issues[0].message);
        return;
      }
      if (form.github_url && !isValidGithubUrl(form.github_url)) {
        toast.error("Please enter a valid GitHub repository URL (e.g. github.com/username/repository)");
        return;
      }
      if (form.youtube_url && !isValidYouTubeUrl(form.youtube_url)) {
        toast.error("Please enter a valid YouTube video URL (e.g. youtube.com/watch?v=... or youtu.be/...)");
        return;
      }
      if (stack.length === 0) {
        toast.error("Add at least one tech stack tag");
        return;
      }
    }
    setSaving(status === "draft" ? "draft" : "submit");

    const payload = {
      ...form,
      github_url: normalizeSocialUrl(form.github_url),
      live_url: normalizeSocialUrl(form.live_url),
      youtube_url: form.youtube_url?.trim() || null,
      stack,
      tags,
      team_members: team,
      images,
      status,
      author_id: user.uid,
      author_name: profile.full_name || "Anonymous",
    };

    try {
      if (isEdit) {
        await setDoc(doc(db, "projects", id!), { ...payload, updated_at: serverTimestamp() }, { merge: true });
      } else {
        await addDoc(collection(db, "projects"), { ...payload, created_at: serverTimestamp() });
      }
      toast.success(
        status === "draft" ? "Draft saved" : "Project submitted for review!"
      );
      navigate("/my-projects");
    } catch (error: any) {
      toast.error(error.message);
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center py-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <button
          onClick={() => navigate("/my-projects")}
          className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back to My Projects
        </button>

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            {isEdit ? "Edit Project" : "Submit a Project"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Showcase your work to the community. Approved submissions earn 50 credits.
          </p>
        </header>

        <div className="space-y-6 bg-card border border-border rounded-xl p-6 md:p-8">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Project Title *</Label>
            <Input
              value={form.title}
              maxLength={100}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Real-time Code Collaboration Tool"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description *</Label>
            <Textarea
              value={form.description}
              maxLength={5000}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does it do? What problem does it solve? What did you learn?"
              className="min-h-[140px]"
            />
            <p className="text-[11px] text-muted-foreground text-right">{form.description.length}/5000</p>
          </div>

          {/* Category */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Live Demo URL</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  value={form.live_url}
                  onChange={(e) => setForm({ ...form, live_url: e.target.value })}
                  placeholder="https://your-project.com"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* GitHub Repo */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">GitHub Repo</Label>
            <div className="relative">
              <Github className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={form.github_url}
                onChange={(e) => setForm({ ...form, github_url: e.target.value })}
                placeholder="https://github.com/you/repo"
                className="pl-9"
              />
            </div>
          </div>

          {/* YouTube Video Demo with Info Guidance Modal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-red-500" />
                YouTube Demo Video
              </Label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 rounded-full border border-border/40 hover:bg-accent"
                  >
                    <Info className="w-3.5 h-3.5 text-primary" />
                    How to add video?
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Video className="w-4 h-4 text-red-500" />
                      </div>
                      How to Add a YouTube Demo Video
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Showcase your project with a 1-3 minute video demonstration directly on your project page.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-3 text-xs leading-relaxed">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50 border border-border/50">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">1</div>
                      <div>
                        <p className="font-semibold text-foreground">Record your project video</p>
                        <p className="text-muted-foreground">Use OBS, Loom, or your phone to record a quick 1-3 min overview showing features & UI.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50 border border-border/50">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">2</div>
                      <div>
                        <p className="font-semibold text-foreground">Upload to YouTube</p>
                        <p className="text-muted-foreground">Go to <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">studio.youtube.com <ExternalLink className="w-2.5 h-2.5" /></a> and click <strong>Create &rarr; Upload Video</strong>.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50 border border-border/50">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">3</div>
                      <div>
                        <p className="font-semibold text-foreground">Set Visibility to "Unlisted"</p>
                        <p className="text-muted-foreground">Selecting <strong>Unlisted</strong> allows anyone with the link to watch your video without it appearing on public YouTube search feeds.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50 border border-border/50">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">4</div>
                      <div>
                        <p className="font-semibold text-foreground">Paste the video link</p>
                        <p className="text-muted-foreground">Copy the YouTube video URL (e.g. <code>youtube.com/watch?v=...</code> or <code>youtu.be/...</code>) and paste it into this field.</p>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative">
              <Video className="absolute left-3 top-2.5 w-4 h-4 text-red-500/80" />
              <Input
                value={form.youtube_url}
                onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="pl-9"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Optional. A video demo will embed directly in your project hero banner.</p>
          </div>

          {/* Tech Stack */}
          <ChipsField
            label="Tech Stack *"
            placeholder="React, Node.js, Postgres..."
            input={stackInput}
            setInput={setStackInput}
            list={stack}
            onAdd={() => addChip(stackInput, stack, setStack, setStackInput)}
            onRemove={(i) => removeChip(i, stack, setStack)}
          />

          {/* Tags */}
          <ChipsField
            label="Search Tags"
            placeholder="ai, productivity, education..."
            input={tagInput}
            setInput={setTagInput}
            list={tags}
            onAdd={() => addChip(tagInput, tags, setTags, setTagInput)}
            onRemove={(i) => removeChip(i, tags, setTags)}
          />

          {/* Team */}
          <ChipsField
            label="Team Members"
            placeholder="Their name..."
            input={teamInput}
            setInput={setTeamInput}
            list={team}
            onAdd={() => addChip(teamInput, team, setTeam, setTeamInput)}
            onRemove={(i) => removeChip(i, team, setTeam)}
          />

          {/* Images */}
          <ImageMultiUpload
            images={images}
            onChange={setImages}
            maxImages={6}
            maxSizeMB={5}
            folder="tech-hub/projects"
            label="Screenshots (max 6, 5MB each)"
          />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => save("draft")}
              disabled={!!saving}
              className="flex-1 gap-2"
            >
              {saving === "draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
              Save Draft
            </Button>
            <Button
              onClick={() => save("pending")}
              disabled={!!saving}
              className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving === "submit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
              Submit for Review
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

const ChipsField = ({
  label, placeholder, input, setInput, list, onAdd, onRemove,
}: {
  label: string; placeholder: string;
  input: string; setInput: (v: string) => void;
  list: string[];
  onAdd: () => void;
  onRemove: (i: number) => void;
}) => (
  <div className="space-y-2">
    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
    <div className="flex gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
      />
      <Button type="button" variant="outline" onClick={onAdd}><Plus size={14} /></Button>
    </div>
    {list.length > 0 && (
      <div className="flex flex-wrap gap-1.5 pt-1">
        {list.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accent text-xs">
            {item}
            <button type="button" onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive">
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
    )}
  </div>
);

export default SubmitProject;
