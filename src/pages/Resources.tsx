import PageLayout from "@/components/PageLayout";
import { BookOpen, FileText, Video, Wrench, ExternalLink, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { ensureUrl } from "@/lib/utils-url";

interface ResourceItem {
  id: string;
  title: string;
  category: string;
  type: string;
  url: string;
}

const getIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'roadmaps': return BookOpen;
    case 'notes & pdfs': return FileText;
    case 'recorded sessions': return Video;
    case 'tools & links': return Wrench;
    default: return FileText;
  }
};

const Resources = () => {
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const q = query(collection(db, "resources"), orderBy("created_at", "asc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ResourceItem));
    },
  });

  // Group resources by category
  const categories = Array.from(new Set(resources.map(r => r.category)));
  const sections = categories.map(cat => ({
    title: cat,
    icon: getIcon(cat),
    items: resources.filter(r => r.category === cat)
  }));

  return (
    <PageLayout>
      <section className="section-padding border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Resources</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need.</h1>
          <p className="text-muted-foreground text-[15px] max-w-md mx-auto">
            Roadmaps, notes, recorded sessions, and tools — curated by the community.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto px-4 space-y-12">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sections.length === 0 ? (
            <p className="text-muted-foreground text-sm py-20 text-center">No resources found.</p>
          ) : (
            sections.map((section, i) => (
              <div key={i}>
                <div className="flex items-center gap-3 mb-4">
                  <section.icon className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="font-semibold text-lg">{section.title}</h2>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {section.items.map((item) => (
                    <a
                      key={item.id}
                      href={ensureUrl(item.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-border rounded-lg p-4 bg-card hover:border-foreground/20 transition-colors flex items-center justify-between group"
                    >
                      <span className="text-sm">{item.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Resources;
