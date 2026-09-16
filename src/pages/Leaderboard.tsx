import PageLayout from "@/components/PageLayout";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

interface Profile {
  id: string;
  full_name: string;
  points: number;
  projects_count: number;
  wins_count: number;
}

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
  if (rank === 3) return <Award className="w-4 h-4 text-amber-600" />;
  return <span className="text-xs text-muted-foreground w-4 text-center">{rank}</span>;
};

const Leaderboard = () => {
  const { data: topContributors = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const q = query(
        collection(db, "profiles"),
        orderBy("points", "desc"),
        limit(10)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Profile));
    },
  });

  return (
    <PageLayout>
      <section className="section-padding border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Leaderboard</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Top contributors.</h1>
          <p className="text-muted-foreground text-[15px] max-w-md mx-auto">
            Recognizing members who've made the biggest impact through projects and contributions.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto px-4 max-w-3xl">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : topContributors.length === 0 ? (
            <p className="text-muted-foreground text-sm py-20 text-center">No contributors found.</p>
          ) : (
            <>
              {/* Top 3 highlight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {topContributors.slice(0, 3).map((c, i) => {
                  const rank = i + 1;
                  return (
                    <div
                      key={c.id}
                      className={`border rounded-lg p-5 bg-card text-center ${
                        rank === 1 ? "border-yellow-500/30" : "border-border"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-muted-foreground mx-auto mb-3">
                        {c.full_name?.split(" ").map(w => w[0]).join("")}
                      </div>
                      <div className="flex justify-center mb-1">
                        <RankIcon rank={rank} />
                      </div>
                      <h3 className="font-semibold text-sm mt-1.5 line-clamp-1">{c.full_name}</h3>
                      <p className="text-xl font-bold text-primary mt-1">{c.points || 0}</p>
                      <p className="text-[11px] text-muted-foreground">points</p>
                    </div>
                  );
                })}
              </div>

              {/* Table */}
              <div className="border border-border rounded-lg overflow-x-auto">
                <div className="min-w-[450px]">
                  <div className="grid grid-cols-[40px_1fr_100px_100px] gap-4 px-4 py-2.5 bg-accent text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    <span>#</span>
                    <span>Member</span>
                    <span className="text-right">Points</span>
                    <span className="text-right">Projects</span>
                  </div>
                  {topContributors.map((c, i) => (
                    <div
                      key={c.id}
                      className="grid grid-cols-[40px_1fr_100px_100px] gap-4 px-4 py-3 border-t border-border items-center hover:bg-accent/50 transition-colors"
                    >
                      <RankIcon rank={i + 1} />
                      <span className="text-sm font-medium truncate">{c.full_name}</span>
                      <span className="text-sm text-right text-primary font-semibold">{c.points || 0}</span>
                      <span className="text-sm text-right text-muted-foreground">{c.projects_count || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Leaderboard;
