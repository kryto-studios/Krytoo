"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/utils/supabase/client";
import { useStudio } from "@/context/StudioContext";
import { ClientLead } from "@/types/pipeline";
import { 
  ArrowLeft, 
  TrendingUp, 
  Table, 
  BarChart3, 
  DollarSign, 
  Briefcase, 
  AlertTriangle, 
  Loader2, 
  PieChart, 
  Target,
  Sparkles,
  Building,
  CheckCircle,
  Clock,
  ThumbsDown
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PipelineAnalyticsPage() {
  const { isAdmin, loading: authLoading } = useStudio();
  const pathname = usePathname();

  // Data States
  const [leads, setLeads] = useState<ClientLead[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch leads
  useEffect(() => {
    if (!isAdmin) return;

    const fetchLeads = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("leads_clients")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setLeads(data || []);
      } catch (err) {
        console.error("Error fetching leads for analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("analytics-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads_clients" },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // Aggregate Calculations
  const stats = useMemo(() => {
    const total = leads.length;
    
    // Status breakdowns
    const approvedLeads = leads.filter(l => l.pitch_status === "Approved");
    const inProcessLeads = leads.filter(l => l.pitch_status === "In Process");
    const laterLeads = leads.filter(l => l.pitch_status === "Later");
    const rejectedLeads = leads.filter(l => l.pitch_status === "Rejected");
    const notContactedLeads = leads.filter(l => l.pitch_status === "Not Contacted");

    // Revenue/Values
    const closedRevenue = approvedLeads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
    const potentialRevenue = inProcessLeads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0) + 
                             laterLeads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
    const outstandingTargets = leads.filter(l => !l.website_exists).length;

    // Niche details
    const niches: Record<string, { count: number; value: number }> = {};
    leads.forEach(l => {
      const niche = l.business_type || "Other";
      if (!niches[niche]) {
        niches[niche] = { count: 0, value: 0 };
      }
      niches[niche].count += 1;
      niches[niche].value += Number(l.estimated_value || 0);
    });

    return {
      total,
      approvedCount: approvedLeads.length,
      inProcessCount: inProcessLeads.length,
      laterCount: laterLeads.length,
      rejectedCount: rejectedLeads.length,
      notContactedCount: notContactedLeads.length,
      closedRevenue,
      potentialRevenue,
      outstandingTargets,
      niches: Object.entries(niches).sort((a, b) => b[1].value - a[1].value)
    };
  }, [leads]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-accent gap-3">
        <Loader2 className="animate-spin" size={40} />
        <span className="text-sm font-medium tracking-wider text-zinc-400 animate-pulse">GENERATING ANALYTICS VIEWPORTS...</span>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#050505] pt-32 pb-20 px-6 relative overflow-hidden">
      {/* Background Lights */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[95%] xl:max-w-[1600px] mx-auto relative z-10">
        
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <Link 
              href="/admin" 
              className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider mb-2 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
            <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Pipeline Analytics Dashboard <BarChart3 className="text-accent" size={24} />
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Real-time breakdown of conversion values, niches, and targets.</p>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div className="flex gap-2 mb-10 border-b border-white/5 pb-4">
          <Link
            href="/admin/pipeline"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <Table size={16} /> Target Leads Spreadsheet
          </Link>
          <Link
            href="/admin/pipeline/analytics"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all bg-accent/15 border border-accent/30 text-accent cursor-pointer"
          >
            <BarChart3 size={16} /> Analytics Viewport
          </Link>
        </div>

        {/* OVERVIEW STATS BLOCKS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          
          {/* Closed revenue */}
          <div className="backdrop-blur-lg bg-zinc-950/40 border border-white/5 shadow-[0_0_20px_rgba(0,240,255,0.05)] rounded-2xl p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Closed Revenue</span>
              <span className="text-xl font-black text-white font-mono mt-0.5 block">
                ${stats.closedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Potential pipeline value */}
          <div className="backdrop-blur-lg bg-zinc-950/40 border border-white/5 shadow-[0_0_20px_rgba(0,240,255,0.05)] rounded-2xl p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">In-Funnel Value</span>
              <span className="text-xl font-black text-white font-mono mt-0.5 block">
                ${stats.potentialRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Total Monitored */}
          <div className="backdrop-blur-lg bg-zinc-950/40 border border-white/5 shadow-[0_0_20px_rgba(0,240,255,0.05)] rounded-2xl p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(14,165,233,0.1)]">
              <Briefcase size={20} />
            </div>
            <div>
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Total Leads</span>
              <span className="text-xl font-black text-white font-mono mt-0.5 block">
                {stats.total}
              </span>
            </div>
          </div>

          {/* Missing Web alert */}
          <div className="backdrop-blur-lg bg-zinc-950/40 border border-white/5 shadow-[0_0_20px_rgba(0,240,255,0.05)] rounded-2xl p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)] animate-pulse">
              <AlertTriangle size={20} />
            </div>
            <div>
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Pitch Target Alerts</span>
              <span className="text-xl font-black text-white font-mono mt-0.5 block text-rose-400">
                {stats.outstandingTargets} Missing Web
              </span>
            </div>
          </div>

        </div>

        {/* DETAILED STATS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Status Breakdown Panel */}
          <div className="backdrop-blur-lg bg-zinc-950/40 border border-white/5 shadow-[0_0_20px_rgba(0,240,255,0.05)] rounded-3xl p-6 lg:col-span-1 flex flex-col">
            <h3 className="text-md font-bold text-white mb-6 flex items-center gap-2">
              <Target className="text-accent" size={16} /> Funnel Conversion Metrics
            </h3>
            
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              
              {/* Approved / Closed */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-400 flex items-center gap-1.5"><CheckCircle size={13} /> Approved (Closed)</span>
                  <span className="text-white font-mono">{stats.approvedCount} ({stats.total > 0 ? Math.round((stats.approvedCount / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.approvedCount / stats.total) * 100 : 0}%` }} />
                </div>
              </div>

              {/* In Process */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-purple-400 flex items-center gap-1.5"><Clock size={13} /> In Process</span>
                  <span className="text-white font-mono">{stats.inProcessCount} ({stats.total > 0 ? Math.round((stats.inProcessCount / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.inProcessCount / stats.total) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Later */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-amber-400 flex items-center gap-1.5"><Clock size={13} /> Follow-up Later</span>
                  <span className="text-white font-mono">{stats.laterCount} ({stats.total > 0 ? Math.round((stats.laterCount / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.laterCount / stats.total) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Not Contacted */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Clock size={13} /> Not Contacted</span>
                  <span className="text-white font-mono">{stats.notContactedCount} ({stats.total > 0 ? Math.round((stats.notContactedCount / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${stats.total > 0 ? (stats.notContactedCount / stats.total) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Rejected */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-rose-400 flex items-center gap-1.5"><ThumbsDown size={13} /> Rejected</span>
                  <span className="text-white font-mono">{stats.rejectedCount} ({stats.total > 0 ? Math.round((stats.rejectedCount / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.rejectedCount / stats.total) * 100 : 0}%` }} />
                </div>
              </div>

            </div>
          </div>

          {/* Niche Categories breakdown List */}
          <div className="backdrop-blur-lg bg-zinc-950/40 border border-white/5 shadow-[0_0_20px_rgba(0,240,255,0.05)] rounded-3xl p-6 lg:col-span-2 flex flex-col">
            <h3 className="text-md font-bold text-white mb-6 flex items-center gap-2">
              <PieChart className="text-accent" size={16} /> Niche Market Breakdown & Potential Revenue
            </h3>
            
            <div className="overflow-x-auto w-full border border-white/5 rounded-2xl bg-black/10 flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="p-4 text-zinc-400 font-bold uppercase tracking-wider">Business Niche</th>
                    <th className="p-4 text-zinc-400 font-bold uppercase tracking-wider text-center">Active Pipelines</th>
                    <th className="p-4 text-zinc-400 font-bold uppercase tracking-wider">Estimated Value ($)</th>
                    <th className="p-4 text-zinc-400 font-bold uppercase tracking-wider">Value Share</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.niches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-500 italic">No leads registered to compute niches.</td>
                    </tr>
                  ) : (
                    stats.niches.map(([niche, details]) => {
                      const totalValue = leads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
                      const share = totalValue > 0 ? Math.round((details.value / totalValue) * 100) : 0;
                      return (
                        <tr key={niche} className="border-b border-white/5 hover:bg-white/[0.01]">
                          <td className="p-4 text-white font-semibold flex items-center gap-2">
                            <Building size={14} className="text-accent" /> {niche}
                          </td>
                          <td className="p-4 text-center font-mono text-zinc-300 font-bold">{details.count} Leads</td>
                          <td className="p-4 text-emerald-400 font-mono font-medium">${details.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-zinc-400 font-bold w-8">{share}%</span>
                              <div className="w-20 h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-accent rounded-full" style={{ width: `${share}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
