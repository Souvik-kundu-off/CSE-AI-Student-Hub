import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const GuestNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Projects", href: "/projects" },
    { label: "Events", href: "/events" },
    { label: "Resources", href: "/resources" },
    { label: "Blog", href: "/blog" },
    { label: "Gallery", href: "/gallery" },
    { label: "Team", href: "/team" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? "bg-background/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/10"
        : "bg-background/60 backdrop-blur-xl border-b border-white/5"
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center group py-1">
            <img
              src="/uni-logo/CSE_AI_WHITE_LOGO_FULL.png"
              alt="CSE-AI Student Hub"
              className="h-12 sm:h-14 md:h-16 lg:h-18 max-h-16 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`relative px-3 py-1.5 text-[13px] font-medium transition-colors ${location.pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {link.label}
                {location.pathname === link.href && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full"
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/login">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Log in</span>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="h-9 px-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold shadow-lg shadow-primary/20 active:scale-95 transition-all text-xs">
                Join Us
              </Button>
            </Link>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden text-foreground p-2 hover:bg-accent rounded-lg">
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden py-4 border-t border-border"
            >
              <div className="grid grid-cols-2 gap-1 mb-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${location.pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent"
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="flex gap-2">
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full h-11 rounded-xl">Log in</Button>
                </Link>
                <Link to="/signup" className="flex-1">
                  <Button className="w-full h-11 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20">Join</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default GuestNavbar;
