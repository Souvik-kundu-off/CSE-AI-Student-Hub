import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu, X, ShieldCheck, LogOut, User, BarChart3, Layout, Calendar,
  Megaphone, Users, BookOpen, ScrollText, Image, FileText, Crown,
  FileSpreadsheet, Home, Settings, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, AppRole, canRead, StaffTab } from "@/lib/permissions";

// All possible admin sub-nav links with their required tab permission
// adminOnly: true means the link is ONLY shown to admin/superadmin regardless of tab access
const ALL_ADMIN_LINKS: { label: string; href: string; icon: any; tab: StaffTab; adminOnly?: boolean }[] = [
  { label: "Overview", href: "/admin", icon: BarChart3, tab: "overview" },
  { label: "Moderation", href: "/admin/moderation", icon: Layout, tab: "moderation" },
  { label: "Events", href: "/admin/events", icon: Calendar, tab: "events" },
  { label: "Broadcasts", href: "/admin/broadcasts", icon: Megaphone, tab: "broadcasts" },
  { label: "Directory", href: "/admin/directory", icon: Users, tab: "directory" },
  { label: "Blog", href: "/admin/blog", icon: FileText, tab: "blog" },
  { label: "Resources", href: "/admin/resources", icon: BookOpen, tab: "resources" },
  { label: "Gallery", href: "/admin/gallery", icon: Image, tab: "resources" },
  { label: "Team", href: "/admin/team", icon: Crown, tab: "directory" },
  { label: "Homepage", href: "/admin/homepage", icon: Home, tab: "settings", adminOnly: true },
  { label: "Reports", href: "/admin/reports", icon: FileSpreadsheet, tab: "reports" },
  { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText, tab: "settings" },
  { label: "Settings", href: "/admin/settings", icon: Settings, tab: "settings" },
];

// Top-level public links (always shown)
const PUBLIC_LINKS = [
  { label: "Projects", href: "/projects" },
  { label: "Events", href: "/events" },
  { label: "Resources", href: "/resources" },
  { label: "Blog", href: "/blog" },
  { label: "Gallery", href: "/gallery" },
  { label: "Team", href: "/team" },
  { label: "Contact", href: "/contact" },
  { label: "Broadcasts", href: "/broadcasts" },
];

const StaffNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdminLinks, setShowAdminLinks] = useState(false);
  const { profile, session, signOut, role } = useAuth();
  const location = useLocation();

  const roleLabel = role ? ROLE_LABELS[role as AppRole] ?? role : "Staff";
  const isAdminArea = location.pathname.startsWith("/admin");

  const isAdminUser = role === "admin" || role === "superadmin";

  // Filter admin links to only those the user can read AND pass adminOnly gate
  const visibleAdminLinks = ALL_ADMIN_LINKS.filter(l =>
    canRead(role, l.tab) && (!l.adminOnly || isAdminUser)
  );

  // Primary admin links (first 5 the user can see)
  const primaryAdminLinks = visibleAdminLinks.slice(0, 5);
  const moreAdminLinks = visibleAdminLinks.slice(5);

  const isActive = (href: string) =>
    href === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(href);

  const isMoreActive = moreAdminLinks.some(l => isActive(l.href));

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-white/5">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/admin" className="flex items-center gap-2.5 group shrink-0 py-1">
            <img
              src="/uni-logo/CSE_AI_WHITE_LOGO_FULL.png"
              alt="CSE-AI Student Hub"
              className="h-12 sm:h-14 md:h-16 lg:h-18 max-h-16 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider ml-1">
              {roleLabel}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0.5 mx-4 overflow-x-auto">
            {isAdminArea ? (
              // Admin sub-navigation
              <>
                {primaryAdminLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <Icon size={13} />
                      {link.label}
                      {active && (
                        <motion.div layoutId="admin-underline" className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                      )}
                    </Link>
                  );
                })}
                {moreAdminLinks.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={`relative flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition-colors ${isMoreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}>
                        More <ChevronDown size={12} />
                        {isMoreActive && (
                          <motion.div layoutId="admin-underline" className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48">
                      <DropdownMenuLabel className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">More Tools</DropdownMenuLabel>
                      {moreAdminLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <DropdownMenuItem key={link.href} asChild className={`cursor-pointer gap-2 ${isActive(link.href) ? "text-primary" : ""}`}>
                            <Link to={link.href}><Icon size={14} /> {link.label}</Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {/* Switch to public view */}
                <Link
                  to="/"
                  className="ml-2 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors border-l border-white/10 pl-4"
                >
                  ← Site
                </Link>
              </>
            ) : (
              // Public nav links
              <>
                {PUBLIC_LINKS.map((link) => (
                  <Link
                    key={link.href}
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
                {/* Switch to admin dashboard */}
                <Link
                  to="/admin"
                  className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors border-l border-white/10 pl-4"
                >
                  <ShieldCheck size={13} /> Dashboard
                </Link>
              </>
            )}
          </div>

          {/* Avatar dropdown */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:ring-2 hover:ring-primary/20">
                  <Avatar className="h-9 w-9 border border-primary/20">
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
                    <p className="text-[10px] leading-none text-primary font-bold uppercase tracking-wider mt-1">{roleLabel}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer gap-2 text-primary">
                  <Link to="/admin"><ShieldCheck size={16} /> Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                  <Link to="/profile"><User size={16} /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                  <LogOut size={16} /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden text-foreground p-2 hover:bg-accent rounded-lg">
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden py-4 border-t border-border"
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">Site</p>
              <div className="grid grid-cols-2 gap-1 mb-4">
                {PUBLIC_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`px-3 py-2.5 text-[13px] font-medium rounded-lg transition-colors ${location.pathname === link.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">Dashboard</p>
              <div className="grid grid-cols-2 gap-1 mb-4">
                {visibleAdminLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium rounded-lg transition-colors ${isActive(link.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                        }`}
                    >
                      <Icon size={14} /> {link.label}
                    </Link>
                  );
                })}
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

export default StaffNavbar;
