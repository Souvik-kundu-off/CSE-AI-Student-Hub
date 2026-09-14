import PageLayout from "@/components/PageLayout";
import { Calendar, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { format } from "date-fns";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author_name: string;
  is_published: boolean;
  published_at: string;
}

const Blog = () => {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog_posts"],
    queryFn: async () => {
      const q = query(
        collection(db, "blog_posts"),
        where("is_published", "==", true),
        orderBy("published_at", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));
    },
  });

  return (
    <PageLayout>
      <section className="section-padding border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Blog</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Updates & insights.</h1>
          <p className="text-muted-foreground text-[15px] max-w-md mx-auto">
            Announcements, articles, and event recaps from the CSE-AI department community.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto px-4 max-w-3xl">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground text-sm py-20 text-center">No blog posts found.</p>
          ) : (
            <div className="space-y-1">
              {posts.map((post) => (
                <article key={post.id} className="border-b border-border py-6 first:pt-0 last:border-0 group">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-primary">{post.category}</span>
                    <span className="text-[11px] text-muted-foreground">•</span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> 
                      {format(new Date(post.published_at), "MMM dd, yyyy")}
                    </span>
                    {post.author_name && (
                      <>
                        <span className="text-[11px] text-muted-foreground">•</span>
                        <span className="text-[11px] text-muted-foreground">{post.author_name}</span>
                      </>
                    )}
                  </div>
                  <h2 className="font-semibold text-lg mb-1.5 group-hover:text-primary transition-colors cursor-pointer">{post.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
                  {post.content && (
                    <details className="mt-3">
                      <summary className="text-xs text-primary cursor-pointer hover:underline font-medium">Read more</summary>
                      <div className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{post.content}</div>
                    </details>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Blog;
