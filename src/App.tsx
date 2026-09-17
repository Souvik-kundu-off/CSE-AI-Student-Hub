import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import About from "./pages/About";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Team from "./pages/Team";
import Resources from "./pages/Resources";
import Blog from "./pages/Blog";
import Broadcasts from "./pages/Broadcasts";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Leaderboard from "./pages/Leaderboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import MyProjects from "./pages/MyProjects";
import SubmitProject from "./pages/SubmitProject";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminModeration from "./pages/admin/AdminModeration";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminBroadcasts from "./pages/admin/AdminBroadcasts";
import AdminDirectory from "./pages/admin/AdminDirectory";
import AdminResources from "./pages/admin/AdminResources";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminReports from "./pages/admin/AdminReports";
import AdminHomepage from "./pages/admin/AdminHomepage";
import AdminReview from "./pages/AdminReview";
import OnboardingCheck from "./components/auth/OnboardingCheck";
import NotFound from "./pages/NotFound";
import GlobalAlertBanner from "./components/GlobalAlertBanner";

import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import AdminJobs from "./pages/admin/AdminJobs";

import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GlobalAlertBanner />
          <OnboardingCheck>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/team" element={<Team />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/broadcasts" element={<Broadcasts />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/my-projects" element={<MyProjects />} />
              <Route path="/submit-project" element={<SubmitProject />} />
              <Route path="/submit-project/:id" element={<SubmitProject />} />
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/jobs" element={<AdminJobs />} />
              <Route path="/admin/moderation" element={<AdminModeration />} />
              <Route path="/admin/events" element={<AdminEvents />} />
              <Route path="/admin/broadcasts" element={<AdminBroadcasts />} />
              <Route path="/admin/directory" element={<AdminDirectory />} />
              <Route path="/admin/resources" element={<AdminResources />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/audit-log" element={<AdminAuditLog />} />
              <Route path="/admin/gallery" element={<AdminGallery />} />
              <Route path="/admin/blog" element={<AdminBlog />} />
              <Route path="/admin/team" element={<AdminTeam />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/homepage" element={<AdminHomepage />} />
              <Route path="/admin-review" element={<AdminReview />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </OnboardingCheck>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
