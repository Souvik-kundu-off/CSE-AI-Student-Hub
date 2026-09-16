import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card/50">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <img
                src="/uni-logo/CSE_AI_WHITE_LOGO_FULL.png"
                alt="CSE-AI Student Hub"
                className="h-16 sm:h-20 w-auto object-contain"
              />
              <img
                src="/uni-logo/bwulogo.png"
                alt="Brainware University"
                className="h-10 sm:h-12 w-auto opacity-90 object-contain"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4 max-w-xs">
            Official project & innovation hub for CSE-AI students, Department of CSE-AI, Brainware University.
          </p>
          <a href="mailto:souvikkundu7880@gmail.com" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Mail className="w-3.5 h-3.5" />
            <span>souvikkundu7880@gmail.com</span>
          </a>
        </div>

        {[
          {
            title: "Pages",
            links: [
              { name: "About", path: "/about" },
              { name: "Events", path: "/events" },
              { name: "Projects", path: "/projects" },
              { name: "Team", path: "/team" },
              { name: "Blog", path: "/blog" },
            ],
          },
          {
            title: "Resources",
            links: [
              { name: "Resource Hub", path: "/resources" },
              { name: "Gallery", path: "/gallery" },
            ],
          },
          {
            title: "Connect & Legal",
            links: [
              { name: "Contact", path: "/contact" },
              { name: "Privacy Policy", path: "/privacy" },
              { name: "Terms of Service", path: "/terms" },
            ],
          },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{col.title}</h4>
            <div className="flex flex-col gap-1.5">
              {col.links.map((item) => (
                <Link key={item.name} to={item.path} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/all-logo-gsa/Google Logo.png"
            alt="Google"
            className="h-6 w-auto opacity-60"
          />
          <span className="text-xs text-muted-foreground">Google Student Community · Brainware University</span>
        </div>
        <img
          src="/all-logo-gsa/Gemini Sparkle.png"
          alt="#TeamGemini"
          className="h-5 w-auto opacity-50"
        />
      </div>
      <div className="border-t border-border mt-6 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CSE-AI Student Hub. Department of CSE-AI, Brainware University.</p>
        <p className="text-xs text-muted-foreground">Built by students. Powered by ideas.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
