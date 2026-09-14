import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  Home, Save, Loader2, Eye, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { logAdminAction } from "./AuditLog";

interface SiteContent {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

const CONTENT_FIELDS = [
  { key: "hero_badge", label: "Hero Badge Text", placeholder: "Open for new members — Spring 2026", type: "text" },
  { key: "hero_headline_1", label: "Hero Headline (Line 1)", placeholder: "Where students build", type: "text" },
  { key: "hero_headline_2", label: "Hero Headline (Line 2 — Highlighted)", placeholder: "real things.", type: "text" },
  { key: "hero_subtext", label: "Hero Subtext", placeholder: "A community of developers, designers...", type: "textarea" },
  { key: "hero_cta_primary", label: "Primary CTA Button Text", placeholder: "Join the Club", type: "text" },
  { key: "hero_cta_secondary", label: "Secondary CTA Button Text", placeholder: "Explore Projects", type: "text" },
  { key: "stat_members", label: "Stats: Members", placeholder: "200+", type: "text" },
  { key: "stat_events", label: "Stats: Events", placeholder: "50+", type: "text" },
  { key: "stat_projects", label: "Stats: Projects", placeholder: "100+", type: "text" },
  { key: "stat_wins", label: "Stats: Wins", placeholder: "25+", type: "text" },
  { key: "cta_headline", label: "CTA Section Headline", placeholder: "Ready to build?", type: "text" },
  { key: "cta_subtext", label: "CTA Section Subtext", placeholder: "Join a community of makers...", type: "textarea" },
];

const HomepageEditor = ({ readonly = false }: { readonly?: boolean }) => {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalContent, setOriginalContent] = useState<Record<string, string>>({});

  useEffect(() => { fetchContent(); }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "site_content"));
      const map: Record<string, string> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        map[data.key || d.id] = data.value;
      });
      setContent(map);
      setOriginalContent(map);
    } catch (err) {
      console.error("Failed to load site content", err);
    }
    setLoading(false);
  };

  const handleChange = (key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setContent(originalContent);
    setHasChanges(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(content);
      for (const [key, value] of entries) {
        await setDoc(doc(db, "site_content", key), {
          key,
          value,
          updated_at: serverTimestamp(),
        }, { merge: true });
      }

      toast.success("Homepage content saved!");
      setOriginalContent(content);
      setHasChanges(false);

      await logAdminAction({
        actionType: "UPDATE",
        targetType: "HOMEPAGE",
        targetId: "site_content",
        targetLabel: "Homepage Content",
        details: `Updated ${entries.length} content fields`,
      });
    } catch (e: any) {
      toast.error("Failed to save content");
      console.error(e);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Home size={20} className="text-primary" /> Homepage Editor
          </h2>
          <p className="text-sm text-muted-foreground">
            Edit the public homepage hero, stats, and call-to-action sections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && !readonly && (
            <Button variant="ghost" onClick={handleReset} className="gap-2 rounded-xl">
              <RotateCcw size={14} /> Reset
            </Button>
          )}
          {!readonly && (
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2 rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-white/10 rounded-[28px] p-6 md:p-8 bg-card/50 space-y-6"
      >
        <h3 className="font-bold text-sm">
          Hero Section
        </h3>
        <div className="grid md:grid-cols-2 gap-5">
          {CONTENT_FIELDS.filter(f => f.key.startsWith("hero_")).map(field => (
            <div key={field.key} className={`space-y-2 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <Textarea
                  value={content[field.key] || ""}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="bg-black/20 border-white/10 rounded-xl min-h-[80px]"
                />
              ) : (
                <Input
                  value={content[field.key] || ""}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="bg-black/20 border-white/10 rounded-xl"
                />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-white/10 rounded-[28px] p-6 md:p-8 bg-card/50 space-y-6"
      >
        <h3 className="font-bold text-sm">📊 Stats Strip</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CONTENT_FIELDS.filter(f => f.key.startsWith("stat_")).map(field => (
            <div key={field.key} className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                {field.label}
              </label>
              <Input
                value={content[field.key] || ""}
                onChange={e => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="bg-black/20 border-white/10 rounded-xl"
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-white/10 rounded-[28px] p-6 md:p-8 bg-card/50 space-y-6"
      >
        <h3 className="font-bold text-sm">🚀 Call-to-Action Section</h3>
        <div className="grid md:grid-cols-2 gap-5">
          {CONTENT_FIELDS.filter(f => f.key.startsWith("cta_")).map(field => (
            <div key={field.key} className={`space-y-2 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <Textarea
                  value={content[field.key] || ""}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="bg-black/20 border-white/10 rounded-xl min-h-[80px]"
                />
              ) : (
                <Input
                  value={content[field.key] || ""}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="bg-black/20 border-white/10 rounded-xl"
                />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Live Preview Hint */}
      <div className="flex items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10">
        <Eye size={16} className="text-primary shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          Changes go live immediately after saving. Visit the homepage to verify your updates.
        </p>
      </div>
    </div>
  );
};

export default HomepageEditor;
