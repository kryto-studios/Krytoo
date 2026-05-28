"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  ChevronDown, 
  Clock, 
  Mail, 
  MessageSquare, 
  User, 
  MapPin, 
  Phone, 
  Sparkles, 
  Briefcase,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { useStudio } from "@/context/StudioContext";
import { useRouter } from "next/navigation";

export default function AppointmentPage() {
  const { user, loading: authLoading } = useStudio();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [pendingWaUrl, setPendingWaUrl] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showWhatsAppModal) {
      timer = setTimeout(() => {
        setShowWhatsAppModal(false);
      }, 5500);
    }
    return () => clearTimeout(timer);
  }, [showWhatsAppModal]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    service: "",
    customService: "", 
    date: "",
    url: "", 
    address: "",
    message: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.service || !formData.date || !formData.url) {
      alert("Please fill in all required fields (Name, Email, Phone, Service, and Date).");
      return;
    }

    const finalServiceName = formData.service === "Other" 
      ? (formData.customService.trim() || "Other Service") 
      : formData.service;
    
    setLoading(true);
    
    try {
      const { error } = await supabase.from('appointments').insert([{
        user_id: user?.id,
        name: formData.name,
        email: formData.email,
        phone: formData.url,
        address: formData.address || null, 
        service: finalServiceName,
        date: new Date(formData.date).toISOString(),
        message: formData.message || null 
      }]);

      if (error) throw error;

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.url,
            address: formData.address || "Not Provided",
            service: finalServiceName,
            date: formData.date,
            message: formData.message || "No project brief provided."
          })
        });
      } catch (emailError) {
        console.error("Failed to send email notification", emailError);
      }

      const waNumber = "919294625866";
      const waText = `Hello Kryto Studio! I just booked an appointment on your website. Here are my details:\n\n*Name:* ${formData.name}\n*Email:* ${formData.email}\n*Address:* ${formData.address || "N/A"}\n*Service:* ${finalServiceName}\n*Message:* ${formData.message || "N/A"}`;
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;
      
      router.refresh();
      setPendingWaUrl(waUrl);
      setShowWhatsAppModal(true);
    } catch (err: any) {
      console.error(err);
      alert("There was an error booking your appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pt-32 pb-20 px-6 relative overflow-hidden">
      {/* Background visual graphics */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight flex items-center justify-center gap-3">
            Book Appointment <Sparkles className="text-accent animate-pulse" size={24} />
          </h1>
          <p className="text-zinc-400 text-sm mt-3 max-w-lg mx-auto font-medium">
            Ready to elevate your digital presence? Fill out the form below and our team will get back to you within 24 hours.
          </p>
        </motion.div>

        {/* Dynamic Widescreen Glass Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="backdrop-blur-xl bg-zinc-950/60 border border-white/10 shadow-[0_0_40px_rgba(0,240,255,0.07)] rounded-[32px] p-8 md:p-12 relative"
        >
          {/* Subtle inside gradient highlight */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent rounded-[32px] pointer-events-none" />

          <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-8">
            
            {/* Split layout: Contact Details vs Project Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              
              {/* Left Column: Contact details */}
              <div className="space-y-6">
                <h3 className="text-sm font-black text-accent uppercase tracking-widest border-b border-white/10 pb-2.5 select-none flex items-center gap-2">
                  <User size={15} /> 1. Personal Information
                </h3>

                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block ml-1">Full Name *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <User size={18} className="text-zinc-500" />
                    </div>
                    <input 
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full bg-black/60 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] text-sm transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block ml-1">Email Address *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Mail size={18} className="text-zinc-500" />
                    </div>
                    <input 
                      type="email" 
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="w-full bg-black/60 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] text-sm transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block ml-1">Phone Number *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Phone size={18} className="text-zinc-500" />
                    </div>
                    <input 
                      type="tel"
                      name="url" 
                      required
                      value={formData.url}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      className="w-full bg-black/60 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] text-sm transition-all font-medium"
                    />
                  </div>
                </div>

                {/* City / Location (Optional) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">City / Location</label>
                    <span className="text-[10px] text-zinc-500 lowercase font-medium">Optional</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <MapPin size={18} className="text-zinc-500" />
                    </div>
                    <input 
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="e.g. Mumbai, Maharashtra"
                      className="w-full bg-black/60 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] text-sm transition-all font-medium"
                    />
                  </div>
                </div>

              </div>

              {/* Right Column: Project details */}
              <div className="space-y-6">
                <h3 className="text-sm font-black text-accent uppercase tracking-widest border-b border-white/10 pb-2.5 select-none flex items-center gap-2">
                  <Briefcase size={15} /> 2. Project Specifications
                </h3>

                {/* Service Type Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block ml-1">Service Required *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Briefcase size={18} className="text-zinc-500" />
                    </div>
                    <select 
                      name="service"
                      required
                      value={formData.service}
                      onChange={handleChange}
                      className="w-full bg-black/60 border border-white/10 rounded-xl py-3.5 pl-12 pr-10 text-white appearance-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 text-sm transition-all cursor-pointer font-medium"
                    >
                      <option value="" disabled className="text-zinc-500 bg-[#0f0f0f]">Select project requirement</option>
                      <option value="Web Development" className="bg-[#0f0f0f] text-white">Web Development</option>
                      <option value="App Development" className="bg-[#0f0f0f] text-white">App Development</option>
                      <option value="Full Stack" className="bg-[#0f0f0f] text-white">Full Stack</option>
                      <option value="Website Redesign" className="bg-[#0f0f0f] text-white">Website Redesign</option>
                      <option value="Video Editing" className="bg-[#0f0f0f] text-white">Video Editing</option>
                      <option value="Consultation" className="bg-[#0f0f0f] text-white">Consultation</option>
                      <option value="Other" className="bg-[#0f0f0f] text-white">Other (Custom Service)</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <ChevronDown size={18} className="text-zinc-500" />
                    </div>
                  </div>
                </div>

                {/* Specifying Custom Service inline niche dynamically */}
                <AnimatePresence>
                  {formData.service === "Other" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <label className="text-xs font-bold text-accent uppercase tracking-wider block ml-1">Specify Custom Service Name *</label>
                      <input 
                        required
                        type="text" 
                        name="customService"
                        value={formData.customService}
                        onChange={handleChange}
                        placeholder="e.g. SEO Audit, Motion Graphic Video, etc." 
                        className="w-full bg-black/60 border border-accent/20 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-zinc-600 font-medium" 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Preferred Date */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block ml-1">Preferred Meeting Date *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Calendar size={18} className="text-zinc-500" />
                    </div>
                    <input 
                      type="date" 
                      name="date"
                      required
                      value={formData.date}
                      onChange={handleChange}
                      className="w-full bg-black/60 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 text-sm transition-all [color-scheme:dark] font-medium"
                    />
                  </div>
                </div>

                {/* Project Brief Description (Optional) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">Project Brief details</label>
                    <span className="text-[10px] text-zinc-500 lowercase font-medium">Optional</span>
                  </div>
                  <div className="relative">
                    <div className="absolute top-4 left-4 pointer-events-none">
                      <MessageSquare size={18} className="text-zinc-500" />
                    </div>
                    <textarea 
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      placeholder="Brief details about your project, goals, specific ideas, or timeline..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] text-xs transition-all resize-none font-medium leading-relaxed"
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* Confirm Submit Booking CTA button */}
            <div className="pt-8 border-t border-white/10 mt-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full relative group bg-accent hover:bg-accent/80 text-white font-bold py-4 rounded-xl overflow-hidden transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_30px_rgba(14,165,233,0.2)]"
              >
                <div className="absolute inset-0 bg-white/10 group-hover:bg-transparent transition-colors z-10" />
                <span className="relative z-20 flex items-center justify-center gap-2 text-sm tracking-widest uppercase">
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Booking Appointment...
                    </>
                  ) : (
                    <>
                      Confirm & Book Session <Clock size={16} />
                    </>
                  )}
                </span>
                
                {/* Visual Neon shadow backdrop glow */}
                <div className="absolute -inset-1 bg-accent blur-xl opacity-20 group-hover:opacity-60 transition-opacity -z-10" />
              </button>
            </div>

          </form>

        </motion.div>
      </div>

      {/* WHATSAPP CONFIRMATION POPUP MODAL */}
      <AnimatePresence>
        {showWhatsAppModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative"
            >
              <div className="w-16 h-16 bg-green-500/20 text-[#25D366] rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Continue to WhatsApp?</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Your appointment has been successfully recorded. Let's redirect you to WhatsApp to instantly message our team.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowWhatsAppModal(false);
                    window.location.href = pendingWaUrl;
                  }}
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 cursor-pointer text-sm"
                >
                  Continue to WhatsApp
                </button>
                <button 
                  onClick={() => setShowWhatsAppModal(false)}
                  className="w-full bg-white/5 hover:bg-white/10 text-zinc-400 font-medium py-3.5 rounded-xl transition-all cursor-pointer text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
