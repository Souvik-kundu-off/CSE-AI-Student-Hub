import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Code, Users, Trophy } from "lucide-react";

const pillars = [
  { 
    icon: BookOpen, 
    title: "Learn", 
    desc: "Hands-on tech workshops on AI, web development, and cloud tools designed for CSE-AI coursework and projects." 
  },
  { 
    icon: Code, 
    title: "Build", 
    desc: "Student project showcases, collaborative repositories, and hackathons tailored for department members." 
  },
  { 
    icon: Users, 
    title: "Connect", 
    desc: "Peer networks across CSE-AI batches, mentor access, and direct collaboration on real-world ideas." 
  },
  { 
    icon: Trophy, 
    title: "Compete", 
    desc: "Internal coding challenges, department leaderboards, and support for participating in national hackathons." 
  },
];

const AboutPreview = () => (
  <section className="section-padding border-t border-border relative overflow-hidden">
    {/* Floating GSA logos */}
    <img src="/all-logo-gsa/10 (14).png" alt="" aria-hidden="true"
      className="hidden sm:block absolute top-12 left-[3%] w-14 md:w-24 opacity-35 pointer-events-none select-none"
      style={{ animation: "aboutFloat 8s ease-in-out 0.5s infinite" }} />
    <img src="/all-logo-gsa/Google Gemini Logo on White.png" alt="" aria-hidden="true"
      className="hidden sm:block absolute bottom-8 right-[4%] w-16 md:w-28 opacity-30 pointer-events-none select-none"
      style={{ animation: "aboutFloat 10s ease-in-out 2s infinite" }} />
    <style>{`@keyframes aboutFloat { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-18px) rotate(2deg)} }`}</style>

    <div className="container mx-auto px-4 relative z-10">
      <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-start">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">About Us</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-5">Departmental Innovation & Learning</h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed mb-4">
            The CSE-AI Student Hub is a student-led initiative created specifically for Computer Science & Engineering (AI) students to bridge academic learning with practical project development.
          </p>
          <p className="text-muted-foreground text-[15px] leading-relaxed mb-6">
            Whether you are building your first web app, experimenting with machine learning models, or preparing for technical competitions, the Hub provides the platform and community to support your work.
          </p>
          <Link to="/about" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            Learn more <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {pillars.map((p, i) => (
            <div key={i} className="border border-border rounded-lg p-5 hover:border-foreground/20 transition-colors bg-card">
              <p.icon className="w-5 h-5 text-primary mb-3" />
              <h3 className="font-semibold text-sm mb-1">{p.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default AboutPreview;
