import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const DEFAULTS: Record<string, string> = {
  cta_headline: "Join the CSE-AI Student Hub",
  cta_subtext: "Submit your projects, discover upcoming department events, and collaborate with your CSE-AI peers.",
};

const CTASection = () => {
  const [content, setContent] = useState<Record<string, string>>(DEFAULTS);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const snapshot = await getDocs(collection(db, "site_content"));
        if (!snapshot.empty) {
          const map: Record<string, string> = { ...DEFAULTS };
          snapshot.docs.forEach((d) => {
            const item = d.data();
            const key = item.key || d.id;
            if (item.value && (key === "cta_headline" || key === "cta_subtext")) {
              map[key] = item.value;
            }
          });
          setContent(map);
        }
      } catch (err) {
        console.error("CTASection content load error", err);
      }
    };
    fetchContent();
  }, []);

  return (
    <section className="section-padding relative overflow-hidden">
      {/* Floating GSA logos */}
      <img src="/all-logo-gsa/element.webp" alt="" aria-hidden="true"
        className="hidden sm:block absolute top-6 left-[6%] w-12 md:w-24 opacity-35 pointer-events-none select-none"
        style={{ animation: "ctaFloat 8s ease-in-out 0.5s infinite" }} />
      <img src="/all-logo-gsa/Gemini Sparkle.png" alt="" aria-hidden="true"
        className="hidden sm:block absolute bottom-6 right-[5%] w-16 md:w-28 opacity-30 pointer-events-none select-none"
        style={{ animation: "ctaFloat 10s ease-in-out 2s infinite" }} />
      <style>{`@keyframes ctaFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }`}</style>

      <div className="container mx-auto px-4 relative z-10">
        {/* Subtle glow behind */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative border border-border rounded-xl p-6 sm:p-10 md:p-16 text-center bg-card overflow-hidden">
          {/* Inner gradient accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.02] pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">{content.cta_headline}</h2>
            <p className="text-muted-foreground text-[15px] max-w-md mx-auto mb-8">
              {content.cta_subtext}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 text-sm font-semibold rounded-lg shadow-lg shadow-primary/20">
                  Get Started <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="h-11 px-8 text-sm border-border hover:bg-accent rounded-lg">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
