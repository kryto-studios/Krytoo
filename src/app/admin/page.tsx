"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import { useStudio } from "@/context/StudioContext";
import { Settings, Users, MessageSquare, Loader2, UploadCloud, Save, X, Globe, Trash2, Plus, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const { settings, refreshSettings, isAdmin, loading: authLoading } = useStudio();
  const [activeTab, setActiveTab] = useState("settings");
  
  // Data States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null);

  // Settings Form States
  const [studioName, setStudioName] = useState(settings.name);
  const [studioBio, setStudioBio] = useState(settings.bio);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Portfolio Form States
  const [newPortfolio, setNewPortfolio] = useState({ title: "", category: "Web Development", link: "" });
  const [savingPortfolio, setSavingPortfolio] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  // Sync state if settings context loads later
  useEffect(() => {
    setStudioName(settings.name);
    setStudioBio(settings.bio);
  }, [settings]);

  const fetchData = async () => {
    setLoadingData(true);
    const [apptsRes, inqsRes, portRes] = await Promise.all([
      supabase.from("appointments").select("*").order("date", { ascending: false }),
      supabase.from("contact_inquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("portfolio").select("*").order("created_at", { ascending: false }),
    ]);

    if (apptsRes.data) setAppointments(apptsRes.data);
    if (inqsRes.data) setInquiries(inqsRes.data);
    if (portRes.data) setPortfolios(portRes.data);
    setLoadingData(false);
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "pending" ? "done" : "pending";
    const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", id);
    if (!error) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    }
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `profile-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('studio-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('studio-assets').getPublicUrl(filePath);
      
      // Update DB
      await supabase.from("studio_settings").update({ profile_pic_url: data.publicUrl }).eq("id", 1);
      await refreshSettings();
      alert("Profile picture updated!");
    } catch (err: any) {
      console.error(err);
      alert("Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("studio_settings").update({
        name: studioName,
        bio: studioBio,
      }).eq("id", 1);
      
      if (error) throw error;
      await refreshSettings();
      alert("Settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPortfolio(true);
    
    // Auto-generate youtube thumbnail if youtube link
    let thumbnailUrl = null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = newPortfolio.link.match(regExp);
    if (match && match[2].length === 11) {
      thumbnailUrl = `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
    }

    const { data, error } = await supabase.from("portfolio").insert([
      {
        title: newPortfolio.title,
        category: newPortfolio.category,
        link: newPortfolio.link,
        thumbnail_url: thumbnailUrl
      }
    ]).select();

    if (!error && data) {
      setPortfolios([data[0], ...portfolios]);
      setNewPortfolio({ title: "", category: "Web App", link: "" });
    } else {
      console.error(error);
      alert("Error saving portfolio.");
    }
    setSavingPortfolio(false);
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const { error } = await supabase.from("portfolio").delete().eq("id", id);
    if (!error) {
      setPortfolios(portfolios.filter(p => p.id !== id));
    }
  };

  if (authLoading || loadingData) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-accent"><Loader2 className="animate-spin" size={32} /></div>;
  }

  if (!isAdmin) return null; // Middleware should catch this, fallback

  return (
    <div className="min-h-screen bg-[#050505] pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Admin Dashboard</h1>
        
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === "settings" ? "bg-accent/20 text-accent" : "text-gray-400 hover:bg-white/5"}`}
          >
            <Settings size={18} /> Studio Settings
          </button>
          <button 
            onClick={() => setActiveTab("portfolio")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === "portfolio" ? "bg-accent/20 text-accent" : "text-gray-400 hover:bg-white/5"}`}
          >
            <Globe size={18} /> Manage Portfolio
          </button>
          <button 
            onClick={() => setActiveTab("appointments")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === "appointments" ? "bg-accent/20 text-accent" : "text-gray-400 hover:bg-white/5"}`}
          >
            <Users size={18} /> Appointments ({appointments.length})
          </button>
          <button 
            onClick={() => setActiveTab("inquiries")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === "inquiries" ? "bg-accent/20 text-accent" : "text-gray-400 hover:bg-white/5"}`}
          >
            <MessageSquare size={18} /> Contact Inquiries ({inquiries.length})
          </button>
          
          <Link 
            href="/admin/pipeline"
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap text-accent border border-accent/20 bg-accent/5 hover:bg-accent/10 hover:text-accent font-semibold ml-auto shadow-[0_0_15px_rgba(14,165,233,0.1)]"
          >
            <TrendingUp size={18} /> Client Pipeline Matrix ⚡
          </Link>
        </div>

        {/* Tab Content */}
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl">
          
          {activeTab === "settings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-2xl">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Dynamic Branding</h2>
                <p className="text-gray-400 text-sm">Update your studio's public appearance.</p>
              </div>

              <div className="flex items-center gap-6">
                {settings.profile_pic_url ? (
                  <img src={settings.profile_pic_url} alt="Profile" className="w-24 h-24 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Users size={32} className="text-gray-500" />
                  </div>
                )}
                <div>
                  <label className="cursor-pointer bg-accent hover:bg-accent/80 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                    {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                    Upload New Image
                    <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} disabled={uploading} />
                  </label>
                  <p className="text-gray-500 text-xs mt-2">Recommended: 256x256px JPG/PNG</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 ml-1">Studio Name</label>
                  <input 
                    type="text" 
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 ml-1">Studio Bio (Hero Text)</label>
                  <textarea 
                    value={studioBio}
                    onChange={(e) => setStudioBio(e.target.value)}
                    rows={4}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 mt-1 resize-none"
                  />
                </div>
                <button 
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all flex items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Settings
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "portfolio" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Manage Portfolio</h2>
                <p className="text-gray-400 text-sm">Add or remove projects from your public portfolio.</p>
              </div>
              
              <form onSubmit={handleAddPortfolio} className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-4 max-w-2xl">
                <div>
                  <label className="text-sm font-medium text-gray-300 ml-1">Project Title</label>
                  <input required value={newPortfolio.title} onChange={e => setNewPortfolio({...newPortfolio, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 mt-1" placeholder="e.g. Zenova E-Commerce" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 ml-1">Category</label>
                  <select required value={newPortfolio.category} onChange={e => setNewPortfolio({...newPortfolio, category: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 mt-1 appearance-none">
                    <option value="Web Development">Web Development</option>
                    <option value="Video Editing">Video Editing</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 ml-1">URL (YouTube / Website / Drive)</label>
                  <input required type="url" value={newPortfolio.link} onChange={e => setNewPortfolio({...newPortfolio, link: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 mt-1" placeholder="https://..." />
                </div>
                <button type="submit" disabled={savingPortfolio} className="bg-accent hover:bg-accent/90 text-white font-medium py-3 px-6 rounded-xl transition-all flex items-center gap-2 mt-4">
                  {savingPortfolio ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  Save to Portfolio
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pt-6">
                {portfolios.map(item => (
                  <div key={item.id} className="bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-white font-semibold truncate pr-2">{item.title}</h4>
                      <button onClick={() => handleDeletePortfolio(item.id)} className="text-red-400 hover:bg-red-400/20 p-1.5 rounded-lg transition-colors shrink-0" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-white/10 text-gray-300 rounded-md w-fit mb-4">{item.category}</span>
                    <a href={item.link} target="_blank" rel="noreferrer" className="text-accent text-xs hover:underline mt-auto truncate w-full block">
                      {item.link}
                    </a>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "appointments" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-4 text-gray-400 font-medium text-sm">Date</th>
                    <th className="py-4 text-gray-400 font-medium text-sm">Name</th>
                    <th className="py-4 text-gray-400 font-medium text-sm">Service</th>
                    <th className="py-4 text-gray-400 font-medium text-sm">Contact</th>
                    <th className="py-4 text-gray-400 font-medium text-sm">Status</th>
                    <th className="py-4 text-gray-400 font-medium text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-4 text-sm text-gray-300">{new Date(a.date).toLocaleDateString()}</td>
                      <td className="py-4 text-sm text-white font-medium">{a.name}</td>
                      <td className="py-4 text-sm text-accent">{a.service}</td>
                      <td className="py-4 text-sm text-gray-400">{a.email}<br/><span className="text-xs">{a.phone}</span></td>
                      <td className="py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${a.status === 'done' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-4 flex gap-2">
                        <button 
                          onClick={() => setSelectedAppointment(a)}
                          className="text-xs bg-accent/20 hover:bg-accent/30 text-accent px-3 py-1.5 rounded-lg transition-all"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(a.id, a.status)}
                          className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-all"
                        >
                          Mark {a.status === 'pending' ? 'Done' : 'Pending'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {appointments.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-500">No appointments found.</td></tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === "inquiries" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-4 text-gray-400 font-medium text-sm">Date</th>
                    <th className="py-4 text-gray-400 font-medium text-sm">Name</th>
                    <th className="py-4 text-gray-400 font-medium text-sm">Subject</th>
                    <th className="py-4 text-gray-400 font-medium text-sm">Message</th>
                    <th className="py-4 text-gray-400 font-medium text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((i) => (
                    <tr key={i.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-4 text-sm text-gray-300">{new Date(i.created_at).toLocaleDateString()}</td>
                      <td className="py-4 text-sm text-white font-medium">{i.name}<br/><span className="text-xs text-gray-500">{i.email}</span></td>
                      <td className="py-4 text-sm text-accent">{i.subject}</td>
                      <td className="py-4 text-sm text-gray-400 max-w-xs truncate" title={i.message}>{i.message}</td>
                      <td className="py-4">
                        <button 
                          onClick={() => setSelectedInquiry(i)}
                          className="text-xs bg-accent/20 hover:bg-accent/30 text-accent px-3 py-1.5 rounded-lg transition-all"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {inquiries.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-500">No inquiries found.</td></tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          )}

        </div>
      </div>

      {/* Appointment Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden relative"
          >
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">Appointment Details</h3>
              <button onClick={() => setSelectedAppointment(null)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Name</p>
                  <p className="text-white text-sm font-medium">{selectedAppointment.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-white text-sm">{selectedAppointment.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-white text-sm">{selectedAppointment.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date</p>
                  <p className="text-white text-sm">{new Date(selectedAppointment.date).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Service</p>
                  <p className="text-accent text-sm font-medium">{selectedAppointment.service}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Address</p>
                  <p className="text-white text-sm">{selectedAppointment.address}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Message</p>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-gray-300 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {selectedAppointment.message || "No message provided."}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setSelectedAppointment(null)}
                className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl transition-all text-sm font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Inquiry Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden relative"
          >
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">Inquiry Details</h3>
              <button onClick={() => setSelectedInquiry(null)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Name</p>
                  <p className="text-white text-sm font-medium">{selectedInquiry.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-white text-sm">{selectedInquiry.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date</p>
                  <p className="text-white text-sm">{new Date(selectedInquiry.created_at).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Address</p>
                  <p className="text-white text-sm">{selectedInquiry.address || "N/A"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Subject</p>
                  <p className="text-accent text-sm font-medium">{selectedInquiry.subject}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Message</p>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-gray-300 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {selectedInquiry.message || "No message provided."}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setSelectedInquiry(null)}
                className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl transition-all text-sm font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
