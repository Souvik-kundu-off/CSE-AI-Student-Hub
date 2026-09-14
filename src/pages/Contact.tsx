import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { Mail, MapPin, Phone, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, "contact_messages"), {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        created_at: serverTimestamp(),
      });

      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <section className="py-8 sm:py-10 border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Contact</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">Get in touch.</h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto">
            Have questions or want to collaborate with the CSE-AI Student Hub? We'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* Contact Form */}
            <div>
              <h2 className="font-semibold text-lg mb-6">Send us a message</h2>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Name</label>
                    <Input 
                      required
                      placeholder="Your name" 
                      className="h-9 text-sm bg-card border-border" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                    <Input 
                      required
                      type="email" 
                      placeholder="you@example.com" 
                      className="h-9 text-sm bg-card border-border" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Subject</label>
                  <Input 
                    required
                    placeholder="What's this about?" 
                    className="h-9 text-sm bg-card border-border" 
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Message</label>
                  <Textarea 
                    required
                    placeholder="Your message..." 
                    className="min-h-[120px] text-sm bg-card border-border resize-none" 
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>
                <Button 
                  disabled={loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-6 text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send Message
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="font-semibold text-lg mb-6">Other ways to reach us</h2>
              <div className="space-y-4">
                {[
                  { icon: Mail, label: "Email", value: "souvikkundu7880@gmail.com", href: "mailto:souvikkundu7880@gmail.com" },
                  { icon: MapPin, label: "Location", value: "Department of CSE-AI, UB-5 , Room 103, Brainware University", href: undefined },
                ].map((item, i) => {
                  const Content = (
                    <div className="flex items-start gap-3 border border-border rounded-lg p-4 bg-card hover:border-foreground/20 transition-colors">
                      <item.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium">{item.value}</p>
                      </div>
                    </div>
                  );
                  return item.href ? (
                    <a key={i} href={item.href}>
                      {Content}
                    </a>
                  ) : (
                    <div key={i}>{Content}</div>
                  );
                })}
              </div>

              <h3 className="font-semibold text-sm mt-8 mb-4">Department Communities</h3>
              <div className="flex gap-3">
                <div className="flex-1 border border-border rounded-lg p-4 bg-card/60 opacity-75 text-center relative overflow-hidden">
                  <span className="absolute top-2 right-2 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-muted-foreground">Soon</span>
                  <MessageCircle className="w-5 h-5 mx-auto mb-1.5 text-emerald-500 opacity-60" />
                  <p className="text-xs font-medium text-muted-foreground">WhatsApp Group</p>
                </div>
                <div className="flex-1 border border-border rounded-lg p-4 bg-card/60 opacity-75 text-center relative overflow-hidden">
                  <span className="absolute top-2 right-2 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-muted-foreground">Soon</span>
                  <MessageCircle className="w-5 h-5 mx-auto mb-1.5 text-indigo-400 opacity-60" />
                  <p className="text-xs font-medium text-muted-foreground">Discord Server</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Contact;
