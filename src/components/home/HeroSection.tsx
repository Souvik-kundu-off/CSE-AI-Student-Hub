import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const DEFAULTS: Record<string, string> = {
  hero_badge: "CSE-AI Department Pilot Launch",
  hero_headline_1: "CSE-AI Student Hub",
  hero_headline_2: "Build. Share. Innovate.",
  hero_subtext: "The official platform for students of Computer Science & Engineering (AI) to showcase projects, access resources, and stay updated on department events.",
  hero_cta_primary: "Get Started",
  hero_cta_secondary: "Explore Projects",
  stat_members: "CSE-AI",
  stat_events: "Active",
  stat_projects: "Student",
  stat_wins: "Community",
};

const HeroSection = () => {
  const [content, setContent] = useState<Record<string, string>>(DEFAULTS);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const snapshot = await getDocs(collection(db, "site_content"));
        if (!snapshot.empty) {
          const map: Record<string, string> = { ...DEFAULTS };
          snapshot.docs.forEach((d) => {
            const item = d.data();
            if (item.value) map[item.key || d.id] = item.value;
          });
          setContent(map);
        }
      } catch (err) {
        console.error("HeroSection content load error", err);
      }
    };
    fetchContent();
  }, []);

  return (
    <section className="relative min-h-[70vh] sm:min-h-[80vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden pt-20 sm:pt-14">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      {/* Radial fade */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_70%)]" />

      {/* Floating GSA logos */}
      <img
        src="/All logo GSA/element.webp"
        alt=""
        aria-hidden="true"
        className="hidden sm:block absolute top-24 left-[8%] w-10 sm:w-14 md:w-20 lg:w-24 opacity-100 pointer-events-none select-none"
        style={{ animation: "heroFloat 6s ease-in-out infinite" }}
      />
      <img
        src="/All logo GSA/05 (9).png"
        alt=""
        aria-hidden="true"
        className="hidden sm:block absolute top-32 right-[12%] w-10 sm:w-14 md:w-20 lg:w-28 opacity-100 pointer-events-none select-none"
        style={{ animation: "heroFloat 8s ease-in-out 1s infinite" }}
      />
      <img
        src="/All logo GSA/04 (8).png"
        alt=""
        aria-hidden="true"
        className="hidden md:block absolute bottom-28 left-[12%] w-14 md:w-20 lg:w-28 opacity-100 pointer-events-none select-none rotate-45"
        style={{ animation: "heroFloat 7s ease-in-out 2s infinite" }}
      />
      <img
        src="/All logo GSA/01 (5).png"
        alt=""
        aria-hidden="true"
        className="hidden md:block absolute bottom-36 right-[10%] w-10 md:w-14 lg:w-16 opacity-100 pointer-events-none select-none"
        style={{ animation: "heroFloat 9s ease-in-out 0.5s infinite" }}
      />

      <style>{`
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
      `}</style>

      <div className="container mx-auto px-5 sm:px-4 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground mb-8 animate-fade-up">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {content.hero_badge}
        </div>

        <h1 className="font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.1] mb-6 animate-fade-up animate-fade-up-delay-1">
          {content.hero_headline_1}
          <br />
          <span className="text-primary">{content.hero_headline_2}</span>
        </h1>

        <p className="text-muted-foreground text-base md:text-lg max-w-lg mx-auto mb-10 leading-relaxed animate-fade-up animate-fade-up-delay-2">
          {content.hero_subtext}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-up animate-fade-up-delay-3">
          <Link to="/signup">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 text-sm">
              {content.hero_cta_primary} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
          <Link to="/projects">
            <Button variant="outline" className="h-10 px-6 text-sm border-border text-foreground hover:bg-accent">
              {content.hero_cta_secondary}
            </Button>
          </Link>
        </div>

        {/* Pilot launch notice */}
        <div className="mt-12 sm:mt-16 animate-fade-up animate-fade-up-delay-3">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-border/80 bg-card/80 backdrop-blur-sm text-xs sm:text-sm text-muted-foreground shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>Just launched for the CSE-AI department — be one of the first members to join & submit projects.</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
