import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, User, ShieldCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const MemberNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, session, signOut } = useAuth();
  const location = useLocation();

  const navLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Projects", href: "/projects" },
    { label: "Events", href: "/events" },
    { label: "Resources", href: "/resources" },
    { label: "Blog", href: "/blog" },
    { label: "Gallery", href: "/gallery" },
    { label: "Team", href: "/team" },
    { label: "Contact", href: "/contact" },
    { label: "Broadcasts", href: "/broadcasts" },
    { label: "Leaderboard", href: "/leaderboard" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-white/5">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center group py-1">
            <img
              src="/uni-logo/CSE_AI_WHITE_LOGO_FULL.png"
              alt="CSE-AI Student Hub"
              className="h-12 sm:h-14 md:h-16 lg:h-18 max-h-16 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`relative px-3 py-1.5 text-[13px] font-medium transition-colors ${location.pathname === link.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {link.label}
                {location.pathname === link.href && (
                  <motion.div layoutId="nav-underline" className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-background transition-all hover:ring-2 hover:ring-primary/20">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                      {profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || <User size={14} />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">{profile?.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                  <Link to="/profile"><User size={16} /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                  <Link to="/my-projects"><ShieldCheck size={16} /> My Projects</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                  <LogOut size={16} /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden text-foreground p-2 hover:bg-accent rounded-lg">
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

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
                    className={`px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${location.pathname === link.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="pt-4 border-t border-border flex flex-col gap-2">
                <Link to="/profile" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-10 px-4">
                    <User size={16} /> My Profile
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 h-10 px-4 text-destructive">
                  <LogOut size={16} /> Log out
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default MemberNavbar;
