"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Search, Filter, Clock, CheckCircle2, Phone, Mail,
  Building2, UserCheck, AlertCircle, RefreshCw, FileText, ChevronRight,
  ExternalLink, UserPlus, Save, Eye, Sparkles, X, Check, Archive, Tag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export interface WebsiteEnquiry {
  id: string;
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  business_type: string;
  message: string;
  status: "pending" | "reviewed" | "contacted" | "converted" | "archived";
  notes: string;
  created_at: string;
  updated_at: string;
}

export default function WebsiteEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<WebsiteEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState<WebsiteEnquiry | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchEnquiries = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const url = new URL("/api/enquiries", window.location.origin);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      if (searchQuery.trim()) url.searchParams.set("search", searchQuery.trim());

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setEnquiries(data.enquiries || []);
      }
    } catch (err) {
      console.error("Failed to load website enquiries:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  // Handle status update
  const handleUpdateStatus = async (id: string, newStatus: WebsiteEnquiry["status"], newNote?: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/enquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: newStatus,
          notes: newNote !== undefined ? newNote : (selectedEnquiry?.notes || "")
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEnquiries((prev) =>
          prev.map((item) => (item.id === id ? data.enquiry : item))
        );
        if (selectedEnquiry?.id === id) {
          setSelectedEnquiry(data.enquiry);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // KPI Metrics
  const totalCount = enquiries.length;
  const pendingCount = enquiries.filter((e) => e.status === "pending").length;
  const reviewedCount = enquiries.filter((e) => e.status === "reviewed" || e.status === "contacted").length;
  const convertedCount = enquiries.filter((e) => e.status === "converted").length;

  const getStatusBadge = (status: WebsiteEnquiry["status"]) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Pending Review
          </span>
        );
      case "reviewed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30 text-[10px] font-extrabold uppercase tracking-wider">
            <Eye className="w-3 h-3 text-blue-500" />
            Reviewed
          </span>
        );
      case "contacted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-600 border border-purple-500/30 text-[10px] font-extrabold uppercase tracking-wider">
            <Phone className="w-3 h-3 text-purple-500" />
            Contacted
          </span>
        );
      case "converted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Converted FBO
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-600 border border-slate-500/30 text-[10px] font-extrabold uppercase tracking-wider">
            <Archive className="w-3 h-3 text-slate-400" />
            Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans safe-top safe-bottom">
      {/* Top Banner Header */}
      <div className="bg-white/95 backdrop-blur-2xl p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Website Enquiries</h1>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                  {pendingCount} NEW
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Review and manage incoming UCO collection requests from website visitors and potential FBO partners
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchEnquiries(true)}
          disabled={refreshing}
          className="self-start md:self-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-2xl border border-slate-200/80 flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
          <span>Refresh Enquiries</span>
        </button>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/95 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/90 shadow-lg shadow-slate-200/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Received</span>
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalCount}</p>
        </div>

        <div className="bg-amber-500/10 backdrop-blur-2xl p-5 rounded-3xl border border-amber-500/20 shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-700 uppercase tracking-wider">Pending Action</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{pendingCount}</p>
        </div>

        <div className="bg-blue-500/10 backdrop-blur-2xl p-5 rounded-3xl border border-blue-500/20 shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-blue-700 uppercase tracking-wider">In Review / Contacted</span>
            <Phone className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-2">{reviewedCount}</p>
        </div>

        <div className="bg-emerald-500/10 backdrop-blur-2xl p-5 rounded-3xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Converted FBOs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{convertedCount}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/95 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All Enquiries" },
            { id: "pending", label: "Pending" },
            { id: "reviewed", label: "Reviewed" },
            { id: "contacted", label: "Contacted" },
            { id: "converted", label: "Converted" },
            { id: "archived", label: "Archived" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by business name, email, phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
          />
        </div>
      </div>

      {/* Enquiries Grid & Drawer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Enquiries List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="p-12 bg-white/95 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading website enquiries...</p>
            </div>
          ) : enquiries.length === 0 ? (
            <div className="p-12 bg-white/95 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Enquiries Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "No enquiries matching your current search or status filter."
                  : "When prospective FBO partners submit enquiries via the homepage website form, they will appear here for review."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {enquiries.map((enquiry) => {
                const isSelected = selectedEnquiry?.id === enquiry.id;
                const formattedDate = new Date(enquiry.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <motion.div
                    key={enquiry.id}
                    layout
                    onClick={() => {
                      setSelectedEnquiry(enquiry);
                      setAdminNote(enquiry.notes || "");
                    }}
                    className={`bg-white/95 backdrop-blur-2xl p-5 rounded-3xl border transition-all cursor-pointer shadow-md hover:shadow-lg ${
                      isSelected
                        ? "border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/10"
                        : "border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 text-base truncate">
                            {enquiry.business_name}
                          </h3>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {enquiry.business_type}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 flex items-center gap-2 flex-wrap">
                          <span>👤 {enquiry.contact_person}</span>
                          <span>•</span>
                          <span>📞 {enquiry.phone}</span>
                          <span>•</span>
                          <span>✉️ {enquiry.email}</span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {getStatusBadge(enquiry.status)}
                        <span className="text-[10px] font-semibold text-slate-400">{formattedDate}</span>
                      </div>
                    </div>

                    {enquiry.message && (
                      <p className="text-xs text-slate-600 font-medium mt-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 line-clamp-2">
                        "{enquiry.message}"
                      </p>
                    )}

                    {enquiry.notes && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-bold text-emerald-800">
                        <FileText className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">Admin Note: {enquiry.notes}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Detailed Review Panel */}
        <div className="lg:col-span-1">
          {selectedEnquiry ? (
            <div className="bg-white/95 backdrop-blur-2xl p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 space-y-6 sticky top-8">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Enquiry Details
                  </span>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">
                    {selectedEnquiry.business_name}
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Received {new Date(selectedEnquiry.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEnquiry(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Selector & Fast Action Buttons */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
                  Update Enquiry Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "pending", label: "Pending", color: "bg-amber-50 border-amber-200 text-amber-800" },
                    { id: "reviewed", label: "Reviewed", color: "bg-blue-50 border-blue-200 text-blue-800" },
                    { id: "contacted", label: "Contacted", color: "bg-purple-50 border-purple-200 text-purple-800" },
                    { id: "converted", label: "Converted FBO", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => handleUpdateStatus(selectedEnquiry.id, st.id as any)}
                      disabled={updatingId === selectedEnquiry.id}
                      className={`p-2.5 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedEnquiry.status === st.id
                          ? `${st.color} ring-2 ring-offset-1 ring-slate-400 font-black shadow-sm`
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {selectedEnquiry.status === st.id && <Check className="w-3.5 h-3.5" />}
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Information & Action Links */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Contact Person Info
                </div>

                <div className="text-xs font-bold text-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Contact Person:</span>
                    <span>{selectedEnquiry.contact_person}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Business Type:</span>
                    <span className="font-extrabold text-emerald-700">{selectedEnquiry.business_type}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Phone:</span>
                    <a
                      href={`https://wa.me/${selectedEnquiry.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {selectedEnquiry.phone}
                    </a>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Email:</span>
                    <a
                      href={`mailto:${selectedEnquiry.email}`}
                      className="text-emerald-700 hover:underline flex items-center gap-1 font-bold truncate max-w-[180px]"
                    >
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      {selectedEnquiry.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Submitted Message */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
                  Submitted UCO Details &amp; Message
                </label>
                <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-medium leading-relaxed border border-slate-800">
                  {selectedEnquiry.message || "No additional message details provided by user."}
                </div>
              </div>

              {/* Admin Internal Notes Form */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
                  Admin Internal Notes &amp; History
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add internal notes (e.g., 'Called manager, agreed on 200L/week schedule')..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                />
                <button
                  onClick={() => handleUpdateStatus(selectedEnquiry.id, selectedEnquiry.status, adminNote)}
                  disabled={updatingId === selectedEnquiry.id}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Notes Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Internal Note
                    </>
                  )}
                </button>
              </div>

              {/* Quick Onboarding Shortcut */}
              <div className="pt-2 border-t border-slate-100">
                <Link
                  href={`/admin/onboarding?business_name=${encodeURIComponent(selectedEnquiry.business_name)}&contact_person=${encodeURIComponent(selectedEnquiry.contact_person)}&phone=${encodeURIComponent(selectedEnquiry.phone)}`}
                  className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition-all text-center"
                >
                  <UserPlus className="w-4 h-4" />
                  Onboard As Official FBO Partner
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-2xl p-8 rounded-3xl border border-slate-200/90 text-center space-y-3 sticky top-8 shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Select an Enquiry</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click on any website enquiry from the list on the left to review submitted kitchen details, update status, and add internal operational notes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
