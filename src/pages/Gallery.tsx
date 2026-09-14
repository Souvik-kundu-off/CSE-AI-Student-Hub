import PageLayout from "@/components/PageLayout";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import EmptyState from "@/components/ui/EmptyState";

interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  album: string;
}

const Gallery = () => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["gallery_public"],
    queryFn: async () => {
      const q = query(
        collection(db, "gallery_items"),
        where("is_visible", "==", true),
        orderBy("sort_order", "asc")
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem));
    },
  });

  // Group by album
  const albums = [...new Set(items.map(i => i.album).filter(Boolean))];
  const ungrouped = items.filter(i => !i.album);

  return (
    <PageLayout>
      <section className="py-8 sm:py-10 border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Gallery</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">Moments captured.</h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
            Photos and highlights from department events, workshops, and student activities.
          </p>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="No gallery photos uploaded"
              description="Photos from workshops, events, and department activities will be displayed here."
            />
          ) : (
            <div className="space-y-10">
              {albums.map(album => {
                const albumItems = items.filter(i => i.album === album);
                return (
                  <div key={album}>
                    <h2 className="text-base font-bold mb-3">{album} <span className="text-xs text-muted-foreground font-normal ml-1">{albumItems.length} photos</span></h2>
                    <div className="flex flex-wrap justify-center gap-4">
                      {albumItems.map(g => (
                        <GalleryCard key={g.id} item={g} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {ungrouped.length > 0 && (
                <div>
                  {albums.length > 0 && <h2 className="text-base font-bold mb-3">Other</h2>}
                  <div className="flex flex-wrap justify-center gap-4">
                    {ungrouped.map(g => (
                      <GalleryCard key={g.id} item={g} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

const GalleryCard = ({ item }: { item: GalleryItem }) => (
  <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] max-w-sm group border border-border rounded-lg overflow-hidden bg-card hover:border-foreground/20 transition-colors cursor-pointer">
    <div className="aspect-video relative overflow-hidden">
      <img
        src={item.image_url}
        alt={item.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <ImageIcon className="w-6 h-6 text-foreground" />
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-sm">{item.title}</h3>
      {item.caption && <p className="text-xs text-muted-foreground mt-0.5">{item.caption}</p>}
    </div>
  </div>
);

export default Gallery;
