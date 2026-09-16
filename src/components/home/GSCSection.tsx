import { ExternalLink } from "lucide-react";

const GSCSection = () => (
  <section className="section-padding border-t border-border relative overflow-hidden">
    {/* Subtle Google-colored gradient accent */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5 pointer-events-none" />

    <div className="container mx-auto px-4 relative z-10">
      <div className="section-header">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Our Community</p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Google Student Community</h2>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="border border-border rounded-2xl bg-card/80 backdrop-blur-sm p-5 sm:p-8 md:p-10 relative overflow-hidden">
          {/* Floating decorative Gemini sparkle */}
          <img
            src="/all-logo-gsa/01 (5).png"
            alt=""
            aria-hidden="true"
            className="absolute -top-6 -right-6 w-28 opacity-10 pointer-events-none select-none rotate-12"
          />

          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Google Logo */}
            <div className="shrink-0">
              <img
                src="/all-logo-gsa/Google Logo.png"
                alt="Google"
                className="h-12 md:h-14 w-auto"
              />
            </div>

            {/* Content */}
            <div className="text-center md:text-left flex-1">
              <h3 className="text-lg font-bold mb-2">
                We are an official Google Student Community
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                CSE-AI Student Hub is proud to host a Google Student Community on campus, led by our Google Student Ambassador.
                Join us for exclusive Google-powered workshops, study jams, and tech events.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Study Jams
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Workshops
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  Cloud Events
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Gemini API
                </span>
              </div>
            </div>
          </div>

          {/* GSA Badge */}
          <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/all-logo-gsa/Gemini Sparkle.png"
                alt="#TeamGemini"
                className="h-8 w-auto"
              />
              <span className="text-xs text-muted-foreground font-medium">
                #TeamGemini · Google Student Ambassador Program 2026
              </span>
            </div>
            <a
              href="/events"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              View GSC Events <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default GSCSection;
