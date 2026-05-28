"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getSortedRowModel, 
  ColumnDef, 
  flexRender,
  SortingState
} from "@tanstack/react-table";
import { supabase } from "@/utils/supabase/client";
import { useStudio } from "@/context/StudioContext";
import { ClientLead, TimelineLog, FunnelStatus } from "@/types/pipeline";
import { 
  Briefcase, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  Search, 
  Plus, 
  X, 
  Calendar, 
  Globe, 
  DollarSign, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  Building,
  Activity,
  Send,
  MessageSquare,
  BarChart3,
  Table,
  Phone,
  Mail,
  Edit2,
  Trash2
} from "lucide-react";
import Link from "next/link";

// Custom simple Markdown Parser for the note timeline
const parseMarkdown = (text: string) => {
  if (!text) return "";
  let html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // bold
    .replace(/\*(.*?)\*/g, "<em>$1</em>") // italic
    .replace(/`(.*?)`/g, "<code class='bg-white/10 px-1 py-0.5 rounded text-accent font-mono text-xs'>$1</code>") // inline code
    .replace(/\n/g, "<br />"); // newlines
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default function PipelineMatrixPage() {
  const { isAdmin, loading: authLoading } = useStudio();

  // Primary Data States
  const [leads, setLeads] = useState<ClientLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sorting, setSorting] = useState<SortingState>([]);

  // Selection & Drawer States
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<TimelineLog[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [noteInput, setNoteInput] = useState("");

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    client_name: "",
    phone_number: "",
    email: "",
    city: "",
    business_type: "Gym",
    custom_business_type: "",
    website_exists: false,
    website_url: "",
    pitch_status: "Not Contacted" as FunnelStatus,
    estimated_value: ""
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLeadData, setEditLeadData] = useState({
    id: "",
    client_name: "",
    phone_number: "",
    email: "",
    city: "",
    business_type: "Gym",
    custom_business_type: "",
    website_exists: false,
    website_url: "",
    pitch_status: "Not Contacted" as FunnelStatus,
    estimated_value: ""
  });

  // Track double-clicked cell editing
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Prevent background body scrolling when any modal is open
  useEffect(() => {
    if (isAddModalOpen || isEditModalOpen || selectedLeadId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isAddModalOpen, isEditModalOpen, selectedLeadId]);

  // Fetch initial data
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
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchLeads();
  }, [isAdmin]);

  // Realtime Subscriptions Setup
  useEffect(() => {
    if (!isAdmin) return;

    // Realtime channel for leads table
    const leadsChannel = supabase
      .channel("leads-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads_clients" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLeads((prev) => [payload.new as ClientLead, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setLeads((prev) =>
              prev.map((lead) => (lead.id === payload.new.id ? (payload.new as ClientLead) : lead))
            );
          } else if (payload.eventType === "DELETE") {
            setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, [isAdmin]);

  // Load timeline logs when a lead is selected
  useEffect(() => {
    if (!selectedLeadId) {
      setTimelineLogs([]);
      return;
    }

    const fetchTimeline = async () => {
      setLoadingTimeline(true);
      try {
        const { data, error } = await supabase
          .from("interaction_timeline")
          .select("*")
          .eq("lead_id", selectedLeadId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTimelineLogs(data || []);
      } catch (err) {
        console.error("Error fetching timeline:", err);
      } finally {
        setLoadingTimeline(false);
      }
    };

    fetchTimeline();

    // Subscribe to timeline changes for selected lead
    const timelineChannel = supabase
      .channel(`timeline-${selectedLeadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interaction_timeline", filter: `lead_id=eq.${selectedLeadId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTimelineLogs((prev) => [payload.new as TimelineLog, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setTimelineLogs((prev) => prev.filter((log) => log.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(timelineChannel);
    };
  }, [selectedLeadId]);

  // Focus inline edit input on activation
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCell]);

  // Helper: Active lead details
  const selectedLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);

  // Dropdown options for cell editing
  const pitchStatusOptions: FunnelStatus[] = ["Not Contacted", "In Process", "Approved", "Rejected", "Later"];
  const businessTypeOptions = ["Gym", "Clinic", "Real Estate", "Restaurant", "E-commerce", "SaaS", "Agency", "Other"];

  // Handle double click cell activation
  const handleCellDoubleClick = (rowId: string, columnId: string, initialValue: any) => {
    setEditingCell({ rowId, columnId });
    setEditValue(initialValue ?? "");
  };

  // Save inline edit to database on blur or enter
  const handleCellSave = async (rowId: string, columnId: string) => {
    if (!editingCell) return;
    setEditingCell(null);

    // Find the lead to check if value actually changed
    const targetLead = leads.find(l => l.id === rowId);
    if (!targetLead) return;

    let parsedValue = editValue;
    if (columnId === "estimated_value") {
      parsedValue = parseFloat(editValue) || 0;
    }

    // Skip if unchanged
    if (targetLead[columnId as keyof ClientLead] === parsedValue) return;

    // Trigger local update immediately for fast UI feedback
    setLeads(prev => prev.map(lead => lead.id === rowId ? { ...lead, [columnId]: parsedValue } : lead));

    try {
      const { error } = await supabase
        .from("leads_clients")
        .update({ [columnId]: parsedValue, updated_at: new Date().toISOString() })
        .eq("id", rowId);

      if (error) {
        throw error;
      }

      // Add a status change note if status was updated
      if (columnId === "pitch_status") {
        await supabase.from("interaction_timeline").insert({
          lead_id: rowId,
          type: "status_change",
          content: `⚡ Status changed from **${targetLead.pitch_status}** to **${parsedValue}**`
        });
      }
    } catch (err) {
      console.error("Error saving lead field:", err);
      // Rollback to original value
      setLeads(prev => prev.map(lead => lead.id === rowId ? { ...lead } : lead));
    }
  };

  // Submit note timeline details
  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedLeadId || !noteInput.trim()) return;

    const contentToSend = noteInput;
    setNoteInput("");

    try {
      const { error } = await supabase.from("interaction_timeline").insert({
        lead_id: selectedLeadId,
        type: "note",
        content: contentToSend
      });

      if (error) throw error;
    } catch (err) {
      console.error("Error inserting timeline note:", err);
      setNoteInput(contentToSend); // Rollback text
    }
  };

  // Keyboard shortcut listener for Note drawer (Cmd+Enter / Ctrl+Enter)
  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddNote();
    }
  };

  // Date picker handler for leads alert deadline
  const handleDeadlineChange = async (dateStr: string) => {
    if (!selectedLeadId) return;

    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === selectedLeadId ? { ...l, reminder_date: dateStr || null } : l));

    try {
      const { error } = await supabase
        .from("leads_clients")
        .update({ reminder_date: dateStr || null, updated_at: new Date().toISOString() })
        .eq("id", selectedLeadId);

      if (error) throw error;

      // Log status update
      await supabase.from("interaction_timeline").insert({
        lead_id: selectedLeadId,
        type: "status_change",
        content: dateStr 
          ? `📅 Set pitch follow-up deadline to **${new Date(dateStr).toLocaleDateString()}**` 
          : "📅 Removed follow-up deadline"
      });
    } catch (err) {
      console.error("Error updating deadline date:", err);
    }
  };

  // Submit new lead modal
  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.client_name) return;

    // Use custom niche text if "Other" is chosen
    const finalNiche = newLead.business_type === "Other" 
      ? newLead.custom_business_type.trim() || "Other" 
      : newLead.business_type;

    try {
      const { data, error } = await supabase.from("leads_clients").insert([
        {
          client_name: newLead.client_name,
          phone_number: newLead.phone_number || null,
          email: newLead.email || null,
          city: newLead.city || null,
          business_type: finalNiche,
          website_exists: newLead.website_exists,
          website_url: newLead.website_url || null,
          pitch_status: newLead.pitch_status,
          estimated_value: parseFloat(newLead.estimated_value) || 0.00
        }
      ]).select();

      if (error) throw error;

      if (data && data[0]) {
        // Insert initial creation timeline log
        await supabase.from("interaction_timeline").insert({
          lead_id: data[0].id,
          type: "status_change",
          content: `🚀 Client Lead profile created for **${data[0].client_name}**`
        });
      }

      setIsAddModalOpen(false);
      setNewLead({
        client_name: "",
        phone_number: "",
        email: "",
        city: "",
        business_type: "Gym",
        custom_business_type: "",
        website_exists: false,
        website_url: "",
        pitch_status: "Not Contacted",
        estimated_value: ""
      });
    } catch (err) {
      console.error("Error creating new lead:", err);
      alert("Error adding lead. Check console.");
    }
  };

  // Activate explicit edit modal
  const openEditModal = (lead: ClientLead) => {
    const isStandardNiche = businessTypeOptions.includes(lead.business_type || "");
    setEditLeadData({
      id: lead.id,
      client_name: lead.client_name,
      phone_number: lead.phone_number || "",
      email: lead.email || "",
      city: lead.city || "",
      business_type: isStandardNiche ? (lead.business_type || "Other") : "Other",
      custom_business_type: isStandardNiche ? "" : (lead.business_type || ""),
      website_exists: lead.website_exists,
      website_url: lead.website_url || "",
      pitch_status: lead.pitch_status,
      estimated_value: lead.estimated_value.toString()
    });
    setIsEditModalOpen(true);
  };

  // Submit full lead edits
  const handleEditLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLeadData.id) return;

    const finalNiche = editLeadData.business_type === "Other"
      ? editLeadData.custom_business_type.trim() || "Other"
      : editLeadData.business_type;

    try {
      const { error } = await supabase
        .from("leads_clients")
        .update({
          client_name: editLeadData.client_name,
          phone_number: editLeadData.phone_number || null,
          email: editLeadData.email || null,
          city: editLeadData.city || null,
          business_type: finalNiche,
          website_exists: editLeadData.website_exists,
          website_url: editLeadData.website_url || null,
          pitch_status: editLeadData.pitch_status,
          estimated_value: parseFloat(editLeadData.estimated_value) || 0.00,
          updated_at: new Date().toISOString()
        })
        .eq("id", editLeadData.id);

      if (error) throw error;

      // Inject status change timeline log
      await supabase.from("interaction_timeline").insert({
        lead_id: editLeadData.id,
        type: "status_change",
        content: `🔧 Client profile fully updated by Admin`
      });

      setIsEditModalOpen(false);
      fetchLeads(); // Force sync
    } catch (err) {
      console.error("Failed updating lead profile details:", err);
    }
  };

  // Delete lead fully
  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this lead? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("leads_clients").delete().eq("id", id);
      if (error) throw error;
      if (selectedLeadId === id) setSelectedLeadId(null);
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  // Filter leads based on global search & status tab select
  const filteredLeadsData = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.client_name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        (lead.email || "").toLowerCase().includes(globalFilter.toLowerCase()) ||
        (lead.phone_number || "").toLowerCase().includes(globalFilter.toLowerCase()) ||
        (lead.city || "").toLowerCase().includes(globalFilter.toLowerCase()) ||
        (lead.business_type || "").toLowerCase().includes(globalFilter.toLowerCase());
      
      const matchesStatus = statusFilter === "All" || lead.pitch_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, globalFilter, statusFilter]);

  // Define TanStack Table Columns
  const columns = useMemo<ColumnDef<ClientLead>[]>(
    () => [
      {
        accessorKey: "client_name",
        header: "Client Name",
        cell: ({ row, getValue, column }) => {
          const val = getValue() as string;
          const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
          return isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleCellSave(row.id, column.id)}
              onKeyDown={(e) => e.key === "Enter" && handleCellSave(row.id, column.id)}
              className="bg-black/60 border border-accent/50 text-white px-2 py-1 rounded w-full outline-none text-sm"
            />
          ) : (
            <div 
              onDoubleClick={() => handleCellDoubleClick(row.id, column.id, val)}
              className="text-white font-semibold cursor-pointer py-1 select-none hover:text-accent transition-colors whitespace-nowrap"
            >
              {val}
            </div>
          );
        }
      },
      {
        accessorKey: "business_type",
        header: "Niche",
        cell: ({ row, getValue, column }) => {
          const val = getValue() as string;
          const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
          return isEditing ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleCellSave(row.id, column.id)}
              className="bg-zinc-900 border border-accent/50 text-white px-2 py-1 rounded w-full outline-none text-xs"
            >
              {businessTypeOptions.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <div 
              onDoubleClick={() => handleCellDoubleClick(row.id, column.id, val)}
              className="text-zinc-300 font-medium cursor-pointer flex items-center gap-1.5 py-1 select-none hover:text-accent transition-colors text-xs whitespace-nowrap"
            >
              <Building size={13} className="text-zinc-500" />
              {val || "N/A"}
            </div>
          );
        }
      },
      {
        accessorKey: "phone_number",
        header: "Phone",
        cell: ({ row, getValue, column }) => {
          const val = getValue() as string;
          const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
          return isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleCellSave(row.id, column.id)}
              onKeyDown={(e) => e.key === "Enter" && handleCellSave(row.id, column.id)}
              className="bg-black/60 border border-accent/50 text-white px-2 py-1 rounded w-full outline-none text-xs"
            />
          ) : (
            <div 
              onDoubleClick={() => handleCellDoubleClick(row.id, column.id, val)}
              className="text-zinc-300 font-mono text-xs cursor-pointer py-1 select-none hover:text-accent transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Phone size={12} className="text-zinc-500" />
              {val || "N/A"}
            </div>
          );
        }
      },
      {
        accessorKey: "email",
        header: "Email Address",
        cell: ({ row, getValue, column }) => {
          const val = getValue() as string;
          const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
          return isEditing ? (
            <input
              ref={editInputRef}
              type="email"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleCellSave(row.id, column.id)}
              onKeyDown={(e) => e.key === "Enter" && handleCellSave(row.id, column.id)}
              className="bg-black/60 border border-accent/50 text-white px-2 py-1 rounded w-full outline-none text-xs"
            />
          ) : (
            <div 
              onDoubleClick={() => handleCellDoubleClick(row.id, column.id, val)}
              className="text-accent text-xs font-semibold cursor-pointer py-1 select-none flex items-center gap-1.5 whitespace-nowrap hover:underline"
              title={val || ""}
            >
              <Mail size={12} className="text-accent/60" />
              {val || "N/A"}
            </div>
          );
        }
      },
      {
        accessorKey: "estimated_value",
        header: "Value ($)",
        cell: ({ row, getValue, column }) => {
          const val = getValue() as number;
          const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
          return isEditing ? (
            <input
              ref={editInputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleCellSave(row.id, column.id)}
              onKeyDown={(e) => e.key === "Enter" && handleCellSave(row.id, column.id)}
              className="bg-black/60 border border-accent/50 text-white px-2 py-1 rounded w-full outline-none text-sm font-mono"
            />
          ) : (
            <div 
              onDoubleClick={() => handleCellDoubleClick(row.id, column.id, val)}
              className="text-emerald-400 font-mono font-medium cursor-pointer py-1 select-none hover:text-accent transition-colors whitespace-nowrap"
            >
              ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          );
        }
      },
      {
        accessorKey: "website_exists",
        header: "Website Status",
        cell: ({ row, column }) => {
          const hasWeb = row.original.website_exists;
          const webUrl = row.original.website_url;
          return (
            <div className="flex items-center gap-2 select-none py-1 whitespace-nowrap">
              <input
                type="checkbox"
                checked={hasWeb}
                onChange={async (e) => {
                  const checkVal = e.target.checked;
                  setLeads(prev => prev.map(l => l.id === row.id ? { ...l, website_exists: checkVal } : l));
                  await supabase.from("leads_clients").update({ website_exists: checkVal }).eq("id", row.id);
                }}
                className="w-4 h-4 accent-accent rounded border-white/10 bg-black/40 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              {hasWeb ? (
                webUrl ? (
                  <a 
                    href={webUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-accent text-xs flex items-center gap-1 hover:underline truncate max-w-[120px]"
                  >
                    <Globe size={12} /> Open Site
                  </a>
                ) : (
                  <span className="text-zinc-400 text-xs">Has Web</span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.15)]">
                  <AlertTriangle size={10} /> PITCH TARGET: MISSING WEB
                </span>
              )}
            </div>
          );
        }
      },
      {
        accessorKey: "pitch_status",
        header: "Status",
        cell: ({ row, getValue, column }) => {
          const val = getValue() as FunnelStatus;
          const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;

          // Render Pills style
          const getPillStyle = (status: FunnelStatus) => {
            switch (status) {
              case "Approved":
                return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
              case "Rejected":
                return "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]";
              case "In Process":
                return "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]";
              case "Later":
                return "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]";
              default:
                return "bg-zinc-500/10 text-zinc-400 border-white/5";
            }
          };

          return isEditing ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleCellSave(row.id, column.id)}
              className="bg-zinc-900 border border-accent/50 text-white px-2 py-1 rounded w-full outline-none text-xs"
            >
              {pitchStatusOptions.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <span 
              onDoubleClick={() => handleCellDoubleClick(row.id, column.id, val)}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold border cursor-pointer select-none inline-block whitespace-nowrap ${getPillStyle(val)}`}
            >
              {val}
            </span>
          );
        }
      },
      {
        accessorKey: "city",
        header: "Location",
        cell: ({ row, getValue, column }) => {
          const val = getValue() as string;
          const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
          return isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleCellSave(row.id, column.id)}
              onKeyDown={(e) => e.key === "Enter" && handleCellSave(row.id, column.id)}
              className="bg-black/60 border border-accent/50 text-white px-2 py-1 rounded w-full outline-none text-xs"
            />
          ) : (
            <div 
              onDoubleClick={() => handleCellDoubleClick(row.id, column.id, val)}
              className="text-zinc-400 text-xs cursor-pointer py-1 select-none hover:text-accent transition-colors whitespace-nowrap"
            >
              {val || "N/A"}
            </div>
          );
        }
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 whitespace-nowrap">
            <button
              onClick={() => setSelectedLeadId(row.original.id)}
              className="p-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all flex items-center gap-1 text-[11px] font-medium cursor-pointer"
              title="Open timeline logs drawer"
            >
              Logs <ChevronRight size={13} />
            </button>
            <button
              onClick={() => openEditModal(row.original)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5 transition-all cursor-pointer"
              title="Edit details"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => handleDeleteLead(row.original.id)}
              className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
              title="Delete lead profile"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )
      }
    ],
    [editingCell, editValue]
  );

  // TanStack table initialization
  const table = useReactTable({
    data: filteredLeadsData,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-accent gap-3">
        <Loader2 className="animate-spin" size={40} />
        <span className="text-sm font-medium tracking-wider text-zinc-400 animate-pulse">BOOTING PIPELINE MATRIX ENGINE...</span>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#050505] pt-32 pb-20 px-6 relative overflow-hidden">
      {/* Visual background lights */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[95%] xl:max-w-[1600px] mx-auto relative z-10">
        
        {/* Header navigation bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <Link 
              href="/admin" 
              className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider mb-2 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
            <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Client Pipeline Management <Sparkles className="text-accent animate-pulse" size={24} />
            </h1>
            <p className="text-zinc-400 text-sm mt-1">High-density glassmorphic spreadsheet database for agency growth.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-accent hover:bg-accent/80 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] flex items-center gap-2 text-sm cursor-pointer"
            >
              <Plus size={18} /> Add Target Lead
            </button>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div className="flex gap-2 mb-10 border-b border-white/5 pb-4">
          <Link
            href="/admin/pipeline"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all bg-accent/15 border border-accent/30 text-accent cursor-pointer"
          >
            <Table size={16} /> Target Leads Spreadsheet
          </Link>
          <Link
            href="/admin/pipeline/analytics"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <BarChart3 size={16} /> Analytics Viewport
          </Link>
        </div>

        {/* MODULE A: HIGH-DENSITY EXCEL ENGINE SPREADSHEET */}
        <div className="backdrop-blur-lg bg-zinc-950/40 border border-white/5 shadow-[0_0_20px_rgba(0,240,255,0.05)] rounded-3xl p-6 relative">
          
          {/* Controls: Search, Tabs */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6">
            
            {/* Custom Tab selectors */}
            <div className="flex gap-2 border-b border-white/5 pb-2 lg:pb-0 overflow-x-auto scrollbar-hide">
              {["All", "Not Contacted", "In Process", "Approved", "Rejected", "Later"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === tab 
                      ? "bg-accent/10 border border-accent/30 text-accent" 
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Filter */}
            <div className="relative max-w-sm w-full">
              <Search className="absolute inset-y-0 left-3.5 my-auto text-zinc-500" size={16} />
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search leads, phone, location..."
                className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 text-sm transition-all"
              />
            </div>

          </div>

          {/* TanStack Table layout with Horizontal Scroll support */}
          <div className="overflow-x-auto w-full border border-white/5 rounded-2xl bg-black/20 scrollbar-thin scrollbar-thumb-zinc-800 min-h-[400px] flex flex-col justify-between">
            <table className="w-full text-left border-collapse min-w-[1200px] text-sm flex-1">
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id} className="border-b border-white/5 bg-white/[0.01]">
                    {group.headers.map((header) => (
                      <th 
                        key={header.id} 
                        className="p-4 text-zinc-400 font-bold text-xs uppercase tracking-wider select-none cursor-pointer hover:text-white transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === "asc" ? " 🔼" : header.column.getIsSorted() === "desc" ? " 🔽" : ""}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                <AnimatePresence layout>
                  {table.getRowModel().rows.map((row) => (
                    <motion.tr 
                      key={row.id} 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`border-b border-white/5 hover:bg-white/[0.01] transition-colors cursor-default ${
                        selectedLeadId === row.original.id ? "bg-white/[0.02] border-r-2 border-r-accent" : ""
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-4 text-zinc-300">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-24 px-4 text-center text-zinc-500 font-medium">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Briefcase size={36} className="text-zinc-600 animate-pulse" />
                        <span>No leads match current filters. Click "Add Target Lead" to build your pipelines!</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-[10px] text-zinc-500 mt-4 select-none italic">
            💡 TIP: Double-click cells to edit value fields instantly. click Logs, Edit, or Delete triggers on the actions row. Use the scrollbar if screen size is narrow.
          </div>

        </div>

      </div>

      {/* MODULE B: ADVANCED PROFILE COMM-TRACKER & LIVE TIMELINE DRAWERS */}
      <AnimatePresence>
        {selectedLeadId && selectedLead && (
          <>
            {/* Dark blur Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLeadId(null)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />

            {/* Right Sliding Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#080808] border-l border-white/10 shadow-2xl flex flex-col p-6 md:p-8 overflow-y-auto"
            >
              
              {/* Drawer header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-md block w-fit mb-3">
                    CLIENT LOG PROFILE
                  </span>
                  <h2 className="text-2xl font-black text-white">{selectedLead.client_name}</h2>
                  <p className="text-zinc-400 text-xs mt-1 font-medium flex items-center gap-1.5">
                    {selectedLead.business_type} • {selectedLead.city || "No Location"}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedLeadId(null)}
                  className="text-zinc-500 hover:text-white bg-white/5 border border-white/10 p-2 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Grid detail blocks */}
              <div className="grid grid-cols-2 gap-4 mb-6 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs">
                <div>
                  <span className="text-zinc-500 block font-bold uppercase tracking-wider mb-1">Email Account</span>
                  <span className="text-white break-all">{selectedLead.email || "N/A"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-bold uppercase tracking-wider mb-1">Phone Number</span>
                  <span className="text-white">{selectedLead.phone_number || "N/A"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-bold uppercase tracking-wider mb-1">Website URL</span>
                  {selectedLead.website_url ? (
                    <a href={selectedLead.website_url} target="_blank" rel="noreferrer" className="text-accent hover:underline flex items-center gap-1">
                      <Globe size={11} /> Open Site
                    </a>
                  ) : (
                    <span className="text-zinc-500">None Provided</span>
                  )}
                </div>
                <div>
                  <span className="text-zinc-500 block font-bold uppercase tracking-wider mb-1">Estimated Value</span>
                  <span className="text-emerald-400 font-mono font-semibold">${Number(selectedLead.estimated_value || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Alert scheduler follow-up date picker */}
              <div className="mb-8 bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
                <label className="text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Calendar size={14} /> Follow-up Alert Schedule Tracker
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={selectedLead.reminder_date ? selectedLead.reminder_date.substring(0, 10) : ""}
                    onChange={(e) => handleDeadlineChange(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-accent/40 w-full"
                  />
                  {selectedLead.reminder_date && (
                    <button
                      onClick={() => handleDeadlineChange("")}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2 px-3 rounded-xl text-xs transition-colors flex shrink-0 cursor-pointer"
                    >
                      Clear Date
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 mt-2">
                  Tag leads as <span className="text-amber-400 font-bold">Later</span> to display notification reminders inside the dashboard header when deadlines hit.
                </p>
              </div>

              {/* Note Note Submission Hub */}
              <div className="mb-8">
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-2">Note Injection Hub</span>
                <form onSubmit={handleAddNote} className="relative">
                  <textarea
                    rows={3}
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={handleNoteKeyDown}
                    placeholder="Enter activity log, call summaries... (Supports **bold**, *italics*, `code`) [Press Cmd+Enter to send]"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-white placeholder-zinc-500 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 text-xs transition-all resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!noteInput.trim()}
                    className="absolute bottom-4 right-4 text-accent hover:text-accent/80 transition-colors disabled:text-zinc-600 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>

              {/* Dynamic Chronological Roadmap Timeline */}
              <div className="flex-1 flex flex-col min-h-0">
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-4 select-none">
                  <Activity size={14} className="text-accent" /> Relational Interaction Timeline
                </span>
                
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 select-none">
                  {loadingTimeline ? (
                    <div className="flex items-center justify-center p-8 text-zinc-500"><Loader2 className="animate-spin" size={20} /></div>
                  ) : timelineLogs.length === 0 ? (
                    <div className="text-center p-8 text-zinc-500 text-xs italic">No logged activity timeline updates found. Try sending a note above.</div>
                  ) : (
                    <div className="relative border-l border-white/5 pl-5 ml-2 space-y-5 py-1">
                      {timelineLogs.map((log) => {
                        const isSystem = log.type === "status_change";
                        return (
                          <div key={log.id} className="relative">
                            
                            {/* Dot */}
                            <div className={`absolute left-[-25px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                              isSystem ? "bg-accent border-black" : "bg-[#050505] border-accent"
                            }`} />
                            
                            <div className="backdrop-blur-lg bg-zinc-950/20 border border-white/5 rounded-2xl p-4 shadow-sm">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-zinc-500 font-mono font-bold">
                                  {new Date(log.created_at).toLocaleString(undefined, {
                                    month: "short",
                                    day: "2-digit",
                                    hour: "numeric",
                                    minute: "2-digit"
                                  })}
                                </span>
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  isSystem ? "bg-accent/10 text-accent border border-accent/20" : "bg-white/5 text-zinc-400"
                                }`}>
                                  {isSystem ? "System" : "Admin Note"}
                                </span>
                              </div>
                              <div className="text-zinc-200 text-xs break-words leading-relaxed select-text">
                                {parseMarkdown(log.content)}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* LEAD CREATION POPUP MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          // Fixed outer container handles scroll natively. centered child modal.
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl my-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-white/5">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <MessageSquare className="text-accent" size={20} /> Register Target Pitch Lead
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <form onSubmit={handleAddLeadSubmit} className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Client Name *</label>
                      <input 
                        required 
                        type="text" 
                        value={newLead.client_name} 
                        onChange={e => setNewLead({...newLead, client_name: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                        placeholder="e.g. FitNation Health Gym" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Business Niche</label>
                      <select 
                        value={newLead.business_type} 
                        onChange={e => setNewLead({...newLead, business_type: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40 appearance-none cursor-pointer"
                      >
                        {businessTypeOptions.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Estimated Value ($)</label>
                      <input 
                        type="number" 
                        value={newLead.estimated_value} 
                        onChange={e => setNewLead({...newLead, estimated_value: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40 font-mono" 
                        placeholder="e.g. 5000" 
                      />
                    </div>

                    {/* Conditional input if 'Other' category is chosen */}
                    {newLead.business_type === "Other" && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="col-span-2 bg-accent/5 border border-accent/15 p-4 rounded-2xl"
                      >
                        <label className="text-xs font-bold text-accent uppercase tracking-wider block ml-1 mb-1.5">Specify Custom Niche Niche Name *</label>
                        <input 
                          required
                          type="text" 
                          value={newLead.custom_business_type} 
                          onChange={e => setNewLead({...newLead, custom_business_type: e.target.value})} 
                          className="w-full bg-black/60 border border-accent/20 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                          placeholder="e.g. Wellness Spa, Boutique Coffee, etc." 
                        />
                      </motion.div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Email Address</label>
                      <input 
                        type="email" 
                        value={newLead.email} 
                        onChange={e => setNewLead({...newLead, email: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                        placeholder="contact@niche.com" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Phone Number</label>
                      <input 
                        type="text" 
                        value={newLead.phone_number} 
                        onChange={e => setNewLead({...newLead, phone_number: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                        placeholder="+1 (555) 000-0000" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Location City</label>
                      <input 
                        type="text" 
                        value={newLead.city} 
                        onChange={e => setNewLead({...newLead, city: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                        placeholder="e.g. New York" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Pitch Status</label>
                      <select 
                        value={newLead.pitch_status} 
                        onChange={e => setNewLead({...newLead, pitch_status: e.target.value as FunnelStatus})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40 appearance-none cursor-pointer"
                      >
                        {pitchStatusOptions.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2 flex items-center gap-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                      <input
                        type="checkbox"
                        checked={newLead.website_exists}
                        onChange={e => setNewLead({...newLead, website_exists: e.target.checked})}
                        className="w-4 h-4 accent-accent rounded border-white/10 bg-black/40 focus:ring-0 cursor-pointer"
                        id="website_exists_checkbox"
                      />
                      <label htmlFor="website_exists_checkbox" className="text-xs font-bold text-zinc-300 cursor-pointer select-none">
                        Active Business Website Exists (Uncheck to flag missing website warning)
                      </label>
                    </div>

                    {newLead.website_exists && (
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Website URL</label>
                        <input 
                          type="url" 
                          value={newLead.website_url} 
                          onChange={e => setNewLead({...newLead, website_url: e.target.value})} 
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                          placeholder="https://..." 
                        />
                      </div>
                    )}

                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-6 rounded-xl transition-all text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="bg-accent hover:bg-accent/80 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] text-sm cursor-pointer"
                    >
                      Save & Build Profile
                    </button>
                  </div>

                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DYNAMIC COMPREHENSIVE EDIT LEAD MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          // Fixed outer container handles scroll natively. centered child modal.
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl my-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-white/5">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Edit2 className="text-accent" size={20} /> Modify Lead profile details
                </h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <form onSubmit={handleEditLeadSubmit} className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Client Name *</label>
                      <input 
                        required 
                        type="text" 
                        value={editLeadData.client_name} 
                        onChange={e => setEditLeadData({...editLeadData, client_name: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Business Niche</label>
                      <select 
                        value={editLeadData.business_type} 
                        onChange={e => setEditLeadData({...editLeadData, business_type: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40 appearance-none cursor-pointer"
                      >
                        {businessTypeOptions.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Estimated Value ($)</label>
                      <input 
                        type="number" 
                        value={editLeadData.estimated_value} 
                        onChange={e => setEditLeadData({...editLeadData, estimated_value: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40 font-mono" 
                      />
                    </div>

                    {/* Specifying custom niche under 'Other' in edit modal */}
                    {editLeadData.business_type === "Other" && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="col-span-2 bg-accent/5 border border-accent/15 p-4 rounded-2xl"
                      >
                        <label className="text-xs font-bold text-accent uppercase tracking-wider block ml-1 mb-1.5">Specify Custom Niche Niche Name *</label>
                        <input 
                          required
                          type="text" 
                          value={editLeadData.custom_business_type} 
                          onChange={e => setEditLeadData({...editLeadData, custom_business_type: e.target.value})} 
                          className="w-full bg-black/60 border border-accent/20 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                        />
                      </motion.div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Email Address</label>
                      <input 
                        type="email" 
                        value={editLeadData.email} 
                        onChange={e => setEditLeadData({...editLeadData, email: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                        placeholder="contact@niche.com" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Phone Number</label>
                      <input 
                        type="text" 
                        value={editLeadData.phone_number} 
                        onChange={e => setEditLeadData({...editLeadData, phone_number: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                        placeholder="+1 (555) 000-0000" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Location City</label>
                      <input 
                        type="text" 
                        value={editLeadData.city} 
                        onChange={e => setEditLeadData({...editLeadData, city: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Pitch Status</label>
                      <select 
                        value={editLeadData.pitch_status} 
                        onChange={e => setEditLeadData({...editLeadData, pitch_status: e.target.value as FunnelStatus})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40 appearance-none cursor-pointer"
                      >
                        {pitchStatusOptions.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2 flex items-center gap-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                      <input
                        type="checkbox"
                        checked={editLeadData.website_exists}
                        onChange={e => setEditLeadData({...editLeadData, website_exists: e.target.checked})}
                        className="w-4 h-4 accent-accent rounded border-white/10 bg-black/40 focus:ring-0 cursor-pointer"
                        id="edit_website_exists_checkbox"
                      />
                      <label htmlFor="edit_website_exists_checkbox" className="text-xs font-bold text-zinc-300 cursor-pointer select-none">
                        Active Business Website Exists (Uncheck to flag missing website warning)
                      </label>
                    </div>

                    {editLeadData.website_exists && (
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block ml-1 mb-1.5">Website URL</label>
                        <input 
                          type="url" 
                          value={editLeadData.website_url} 
                          onChange={e => setEditLeadData({...editLeadData, website_url: e.target.value})} 
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-accent/40" 
                        />
                      </div>
                    )}

                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-6 rounded-xl transition-all text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="bg-accent hover:bg-accent/80 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] text-sm cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>

                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
