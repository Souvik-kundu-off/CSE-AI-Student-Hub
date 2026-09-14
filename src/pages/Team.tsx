import { useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Github, Linkedin, Twitter, Loader2, Users, GraduationCap, Plus, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { ensureUrl } from "@/lib/utils-url";
import EmptyState from "@/components/ui/EmptyState";

interface TeamMember {
  id: string;
  full_name: string;
  role: string;
  department: string;
  avatar_url?: string;
  github_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  is_faculty: boolean;
}

const getInitials = (name: string) => {
  if (!name) return "TH";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const TeamAvatar = ({ src, name }: { src?: string; name: string }) => {
  const [hasError, setHasError] = useState(false);
  const initials = getInitials(name);

  return (
    <div className="w-12 h-12 rounded-full bg-accent border border-border flex items-center justify-center text-sm font-bold text-primary mb-4 overflow-hidden shrink-0 select-none">
      {src && !hasError ? (
        <img
          src={src}
          alt=""
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

const TeamCard = ({ member, className = "" }: { member: TeamMember; className?: string }) => (
  <div className={`border border-border rounded-xl p-5 bg-card hover:border-foreground/20 transition-all flex flex-col justify-between ${className}`}>
    <div>
      <TeamAvatar src={member.avatar_url} name={member.full_name} />
      <h3 className="font-semibold text-base">{member.full_name}</h3>
      <p className="text-xs text-primary font-medium mt-0.5">{member.role}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{member.department}</p>
    </div>
    <div className="flex gap-1.5 mt-4 pt-3 border-t border-border/60">
      {member.github_url && (
        <a
          href={ensureUrl(member.github_url)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="GitHub Profile"
        >
          <Github className="w-4 h-4" />
        </a>
      )}
      {member.linkedin_url && (
        <a
          href={ensureUrl(member.linkedin_url)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="LinkedIn Profile"
        >
          <Linkedin className="w-4 h-4" />
        </a>
      )}
      {member.twitter_url && (
        <a
          href={ensureUrl(member.twitter_url)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Twitter/X Profile"
        >
          <Twitter className="w-4 h-4" />
        </a>
      )}
    </div>
  </div>
);

const JoinTeamCard = () => (
  <div className="w-full sm:w-[calc(50%-0.5rem)] max-w-sm border border-dashed border-primary/40 rounded-xl p-5 bg-card/60 hover:bg-card transition-all flex flex-col justify-between">
    <div>
      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
        <Plus className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-base">Join Core Team</h3>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
        Passionate about organizing events, mentoring, or developing student software? Get involved with the Hub team.
      </p>
    </div>
    <div className="mt-4 pt-3 border-t border-border/60">
      <Link to="/contact" className="inline-flex items-center text-xs font-semibold text-primary hover:underline gap-1">
        Get involved <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  </div>
);

const Team = () => {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const q = query(collection(db, "team_members"), orderBy("sort_order", "asc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMember));
    },
  });

  const coreTeam = members.filter((m) => !m.is_faculty);
  const faculty = members.filter((m) => m.is_faculty);

  return (
    <PageLayout>
      <section className="py-8 sm:py-10 border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Team</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">The people behind it all.</h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
            Meet the students, coordinators, and mentors shaping the CSE-AI Student Hub.
          </p>
        </div>
      </section>

      {/* Core Team */}
      <section className="py-6 sm:py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-lg font-bold mb-6 text-center sm:text-left">Core Team</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : coreTeam.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No core team members listed"
              description="Team profiles will be displayed here as positions are updated."
            />
          ) : (
            <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
              {coreTeam.map((m) => (
                <TeamCard
                  key={m.id}
                  member={m}
                  className="w-full sm:w-[calc(50%-0.5rem)] max-w-sm"
                />
              ))}
              <JoinTeamCard />
            </div>
          )}
        </div>
      </section>

      {/* Faculty */}
      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-lg font-bold mb-6 text-center sm:text-left">Faculty Coordinators</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : faculty.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No faculty coordinators listed"
              description="Departmental faculty mentors and coordinators will be listed here once assigned."
            />
          ) : (
            <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
              {faculty.map((f) => (
                <TeamCard key={f.id} member={f} className="w-full sm:w-[calc(50%-0.5rem)] max-w-sm" />
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Team;
