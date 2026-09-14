import { useEffect, useMemo } from "react";
import PageLayout from "@/components/PageLayout";
import {
  ShieldCheck, Layout, Megaphone, Users, Settings, Loader2, AlertCircle,
  BookOpen, BarChart3, Calendar, Lock, ClipboardList, BarChart2, FileText,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectModeration from "@/components/admin/ProjectModeration";
import BroadcastManager from "@/components/admin/BroadcastManager";
import MemberManager from "@/components/admin/MemberManager";
import MaintenancePanel from "@/components/admin/MaintenancePanel";
import ResourceManager from "@/components/admin/ResourceManager";
import EventManager from "@/components/admin/EventManager";
import AnalyticsPanel from "@/components/admin/AnalyticsPanel";
import EventRegistrations from "@/components/admin/EventRegistrations";
import ReportsPanel from "@/components/admin/ReportsPanel";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { isStaff, canRead, canWrite, ROLE_LABELS, AppRole, StaffTab } from "@/lib/permissions";

interface TabDef {
  key: StaffTab;
  label: string;
  icon: any;
  Component: React.ComponentType<{ readOnly?: boolean }>;
}

const TABS: TabDef[] = [
  { key: "overview",      label: "Overview",      icon: BarChart3,    Component: AnalyticsPanel },
  { key: "moderation",    label: "Moderation",    icon: Layout,       Component: ProjectModeration },
  { key: "events",        label: "Events",        icon: Calendar,     Component: EventManager },
  { key: "registrations", label: "Registrations", icon: ClipboardList,Component: EventRegistrations },
  { key: "broadcasts",    label: "Broadcasts",    icon: Megaphone,    Component: BroadcastManager },
  { key: "directory",     label: "Directory",     icon: Users,        Component: MemberManager },
  { key: "resources",     label: "Resources",     icon: BookOpen,     Component: ResourceManager },
  { key: "reports",       label: "Reports",       icon: BarChart2,    Component: ReportsPanel },
  { key: "settings",      label: "Settings",      icon: Settings,     Component: MaintenancePanel },
];
import { Navigate } from "react-router-dom";

// Redirect /admin to /admin/overview for backwards compatibility
const AdminDashboard = () => {
  const { role, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const visibleTabs = useMemo(
    () => TABS.filter((t) => canRead(role, t.key)),
    [role]
  );

  const activeTab = searchParams.get("tab") || visibleTabs[0]?.key || "overview";

  // If user lands on a tab they can't see, redirect to first available
  useEffect(() => {
    if (!authLoading && visibleTabs.length > 0 && !visibleTabs.find((t) => t.key === activeTab)) {
      setSearchParams({ tab: visibleTabs[0].key }, { replace: true });
    }
  }, [authLoading, activeTab, visibleTabs, setSearchParams]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground animate-pulse font-medium">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (!isStaff(role)) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-40">
          <AlertCircle size={48} className="text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-sm">This area is reserved for staff members.</p>
        </div>
      </PageLayout>
    );
  }

  const roleLabel = role ? ROLE_LABELS[role as AppRole] ?? role : "Staff";

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <header className="mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary mb-4">
                <ShieldCheck size={12} />
                {roleLabel} Panel
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Command Center.</h1>
              <p className="text-muted-foreground max-w-lg">
                Your tools and views are tailored to your role. Read-only sections are marked.
              </p>
            </div>
          </motion.div>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setSearchParams({ tab: value })}
          className="space-y-8"
        >
          <div className="sticky top-20 z-30 bg-background/80 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 border-b border-white/5">
            <TabsList className="bg-white/5 border border-white/10 p-1.5 h-14 rounded-2xl overflow-x-auto justify-start md:justify-center">
              {visibleTabs.map(({ key, label, icon: Icon }) => {
                const writable = canWrite(role, key);
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="rounded-xl px-4 md:px-5 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap"
                  >
                    <Icon size={16} /> {label}
                    {!writable && <Lock size={11} className="opacity-60" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {visibleTabs.map(({ key, Component }) => {
            const readOnly = !canWrite(role, key);
            return (
              <TabsContent key={key} value={key} className="mt-0 outline-none">
                {readOnly && (
                  <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
                    <Lock size={12} /> Read-only access — your role can view but not modify this section.
                  </div>
                )}
                <Component readOnly={readOnly} />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default AdminDashboard;
