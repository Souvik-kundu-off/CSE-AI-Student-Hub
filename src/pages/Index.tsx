import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/home/HeroSection";
import MemberHome from "@/components/home/MemberHome";
import FeaturedEvents from "@/components/home/FeaturedEvents";
import AboutPreview from "@/components/home/AboutPreview";
import FeaturedProjects from "@/components/home/FeaturedProjects";
import GSCSection from "@/components/home/GSCSection";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isStaff } from "@/lib/permissions";

const Index = () => {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session && isStaff(role)) {
      navigate("/admin", { replace: true });
    }
  }, [loading, session, role, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground animate-pulse font-medium">Synchronizing with Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {session ? (
        <MemberHome />
      ) : (
        <>
          <HeroSection />
          <AboutPreview />
          <FeaturedProjects />
          <FeaturedEvents />
          <GSCSection />
          <CTASection />
        </>
      )}
      <Footer />
    </div>
  );
};

export default Index;
