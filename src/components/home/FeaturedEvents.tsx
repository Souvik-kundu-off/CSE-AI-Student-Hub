import { Link } from "react-router-dom";
import { ArrowRight, Calendar, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { format, isValid, parseISO } from "date-fns";
import EmptyState from "@/components/ui/EmptyState";

const safeFormatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "TBD";
  try {
    const d = new Date(dateStr);
    return isValid(d) ? format(d, "MMM dd, yyyy") : "TBD";
  } catch {
    return "TBD";
  }
};

const FeaturedEvents = () => {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["featured_events"],
    queryFn: async () => {
      const q = query(collection(db, "events"), orderBy("date", "asc"), limit(3));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },
  });

  return (
    <section className="section-padding relative overflow-hidden">
      {/* Floating GSA logos */}
      <img src="/All logo GSA/Gemini Sparkle.png" alt="" aria-hidden="true"
        className="hidden sm:block absolute top-8 right-[5%] w-14 md:w-28 opacity-30 pointer-events-none select-none"
        style={{ animation: "sectionFloat 7s ease-in-out infinite" }} />
      <img src="/All logo GSA/07 (1).png" alt="" aria-hidden="true"
        className="hidden sm:block absolute bottom-10 left-[4%] w-12 md:w-24 opacity-30 pointer-events-none select-none"
        style={{ animation: "sectionFloat 9s ease-in-out 1.5s infinite" }} />
      <style>{`@keyframes sectionFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }`}</style>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 sm:mb-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Upcoming</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Featured Events</h2>
          </div>
          <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 shrink-0">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming events scheduled"
            description="Department workshops, study jams, and hackathons will appear here as schedules are announced."
          />
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {events.map((event) => (
              <Link to={`/events/${event.id}`} key={event.id} className="group border border-border rounded-xl overflow-hidden hover:border-foreground/20 transition-all bg-card">
                {/* Event banner */}
                {event.banner_url && (
                  <div className="w-full h-36 overflow-hidden bg-accent">
                    <img
                      src={event.banner_url}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-primary">{event.type}</span>
                    <span className="text-[11px] text-muted-foreground">{event.spots} spots</span>
                  </div>
                  <h3 className="font-semibold text-[15px] mb-3 group-hover:text-primary transition-colors">{event.title}</h3>
                  <div className="flex flex-col gap-1.5 text-[13px] text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {safeFormatDate(event.date)}
                    </span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {event.location}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-xs h-8 border-border hover:bg-accent" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    Register
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedEvents;
