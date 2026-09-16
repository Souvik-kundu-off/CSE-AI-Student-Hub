import { useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Calendar, MapPin, Users, Loader2, ExternalLink, Globe, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import EmptyState from "@/components/ui/EmptyState";

interface EventRow {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  type: string;
  spots: number;
  mode: string;
  is_upcoming: boolean;
  event_type: "inside" | "outside" | null;
  external_url: string | null;
  banner_url: string | null;
}

const filters = ["All", "Hackathon", "Workshop", "Competition", "Gaming"];

const Events = () => {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [filter, setFilter] = useState("All");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", tab],
    queryFn: async () => {
      const q = query(
        collection(db, "events"),
        where("is_upcoming", "==", tab === "upcoming")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as EventRow));
      return list.sort((a: any, b: any) => {
        const tA = a.created_at?.seconds || (typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : 0);
        const tB = b.created_at?.seconds || (typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : 0);
        return tB - tA;
      });
    },
  });

  const filtered = events.filter((e) => filter === "All" || e.type === filter);

  return (
    <PageLayout>
      <section className="py-8 sm:py-10 border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Events</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">Learn, compete, grow.</h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
            From hackathons to workshops — explore department events that sharpen your skills.
          </p>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div className="flex gap-1 border border-border rounded-lg p-1 w-fit">
              {(["upcoming", "past"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3.5 py-1.5 text-xs sm:text-sm rounded-md capitalize transition-colors ${
                    tab === t ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                    filter === f
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={tab === "upcoming" ? "No upcoming events scheduled" : "No past events record"}
              description={
                filter !== "All"
                  ? `No ${filter.toLowerCase()} events found in this view.`
                  : tab === "upcoming"
                  ? "Department workshops, hackathons, and study jams will appear here as schedules are announced."
                  : "Past event archives will appear here after events complete."
              }
            />
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {filtered.map((event) => (
                <Link to={`/events/${event.id}`} key={event.id} className="w-full sm:w-[calc(50%-0.5rem)] max-w-md group border border-border rounded-xl overflow-hidden bg-card hover:border-foreground/20 transition-all cursor-pointer flex flex-col justify-between">
                  {/* Event banner */}
                  {event.banner_url && (
                    <div className="w-full h-44 overflow-hidden bg-accent">
                      <img
                        src={event.banner_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-6">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      event.event_type === "inside" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {event.event_type === "inside" ? <Layers size={10} /> : <Globe size={10} />}
                      {event.event_type === "inside" ? "Inside" : "Outside"}
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-primary">{event.type}</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">{event.mode}</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
                  <div className="flex flex-wrap gap-4 text-[13px] text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {event.date || "To be discussed"}</span>
                    {event.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {event.location}</span>}
                    {event.spots != null && <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {event.spots} spots</span>}
                  </div>
                  {event.is_upcoming && (
                    event.event_type === "outside" && event.external_url ? (
                      <span onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); window.open(event.external_url, "_blank"); }}>
                        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8 gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" /> Register Externally
                        </Button>
                      </span>
                    ) : (
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8">
                        {event.event_type === "inside" ? "View & Register" : "View Details"}
                      </Button>
                    )
                  )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Events;
