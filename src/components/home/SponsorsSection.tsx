const sponsors = ["PrepVerse", "TechCorp", "DevHub", "CloudBase", "InnoLabs", "CodeAcademy", "ByteWorks", "StackBuild"];

const SponsorsSection = () => (
  <section className="section-padding border-t border-border relative overflow-hidden">
    {/* Floating GSA logos */}
    <img src="/all-logo-gsa/10 (14).png" alt="" aria-hidden="true"
      className="hidden sm:block absolute top-6 right-[4%] w-10 md:w-20 opacity-30 pointer-events-none select-none"
      style={{ animation: "sponsorFloat 8s ease-in-out infinite" }} />
    <img src="/all-logo-gsa/07 (1).png" alt="" aria-hidden="true"
      className="hidden sm:block absolute bottom-8 left-[3%] w-12 md:w-22 opacity-35 pointer-events-none select-none"
      style={{ animation: "sponsorFloat 7s ease-in-out 1s infinite" }} />
    <style>{`@keyframes sponsorFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      @keyframes marquee-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }`}</style>

    <div className="container mx-auto px-4 relative z-10">
      <div className="section-header">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Partners</p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Backed by the best</h2>
      </div>

      {/* Marquee */}
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex" style={{ animation: "marquee-scroll 25s linear infinite" }}>
          {[...sponsors, ...sponsors].map((name, i) => (
            <div key={i} className="shrink-0 mx-2 border border-border rounded-lg h-20 w-40 flex items-center justify-center hover:border-foreground/20 transition-colors bg-card">
              <span className="font-semibold text-sm text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default SponsorsSection;
