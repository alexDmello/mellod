"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatLiters, formatDate } from "@/lib/utils";
import {
  Truck,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  UserCheck,
  Building2,
  MapPin,
  Phone,
  AlertCircle,
  AlertTriangle,
  Loader2,
  X,
  Droplets,
  FileCheck,
} from "lucide-react";
import type { PickupRequest, Picker, Profile, FBO } from "@/lib/types";
import AdminPickupReview from "@/components/AdminPickupReview";
import ExceptionsTab from "../routes/ExceptionsTab";

type ExtendedPickupRequest = PickupRequest & {
  fbo: FBO;
  picker?: Picker & { profile?: Profile };
};

type PickerWithProfile = Picker & { profile: Profile };

function PickupRequestsHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"requests" | "reviews" | "closed">(
    tabParam === "reviews" ? "reviews" : tabParam === "closed" || tabParam === "exceptions" ? "closed" : "requests"
  );

  useEffect(() => {
    if (tabParam === "reviews" || tabParam === "requests" || tabParam === "closed" || tabParam === "exceptions") {
      setActiveTab(tabParam === "closed" || tabParam === "exceptions" ? "closed" : (tabParam as "requests" | "reviews"));
    }
  }, [tabParam]);

  const handleTabChange = (tab: "requests" | "reviews" | "closed") => {
    setActiveTab(tab);
    router.push(`/admin/pickup-requests?tab=${tab}`);
  };

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ExtendedPickupRequest[]>([]);
  const [pickers, setPickers] = useState<PickerWithProfile[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State for Scheduling / Assigning
  const [selectedRequest, setSelectedRequest] = useState<ExtendedPickupRequest | null>(null);
  const [assignPickerId, setAssignPickerId] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("admin_pickup_requests_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pickup_requests",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch Pickup Requests with FBO & Picker profile details
      const { data: reqData, error: reqErr } = await supabase
        .from("pickup_requests")
        .select("*, fbo:fbos(*), picker:pickers(*, profile:profiles(*))")
        .order("created_at", { ascending: false });

      if (!reqErr && reqData) {
        setRequests(reqData as ExtendedPickupRequest[]);
      }

      // Fetch Pickers with Profiles for dropdown assignment
      const { data: pickerData, error: pickerErr } = await supabase
        .from("pickers")
        .select("*, profile:profiles(*)")
        .eq("is_active", true);

      if (!pickerErr && pickerData) {
        setPickers(pickerData as PickerWithProfile[]);
      }
    } catch (e) {
      console.warn("Error loading pickup requests data:", e);
    } finally {
      setLoading(false);
    }
  }

  // Filtered requests list
  const filteredRequests = requests.filter((req) => {
    let matchesStatus = true;
    if (filterStatus === "active") {
      matchesStatus =
        req.status === "pending" ||
        req.status === "assigned" ||
        req.status === "scheduled" ||
        req.status === "in_transit";
    } else if (filterStatus !== "all") {
      matchesStatus = req.status === filterStatus;
    }
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      req.fbo?.business_name?.toLowerCase().includes(searchLower) ||
      req.fbo?.address?.toLowerCase().includes(searchLower) ||
      req.notes?.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  // KPI calculations
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const scheduledCount = requests.filter((r) => r.status === "scheduled" || r.status === "assigned" || r.status === "in_transit").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;
  const totalVolumeRequested = requests
    .filter((r) => r.status !== "cancelled")
    .reduce((acc, r) => acc + Number(r.estimated_liters), 0);

  // Update Status / Assign Picker
  async function handleUpdateRequestStatus(
    newStatus: "scheduled" | "assigned" | "in_transit" | "completed" | "cancelled"
  ) {
    if (!selectedRequest) return;

    setUpdating(true);
    try {
      const updatePayload: Partial<PickupRequest> = {
        status: newStatus,
        admin_notes: adminNotes || undefined,
        updated_at: new Date().toISOString(),
      };

      if (assignPickerId) {
        updatePayload.assigned_picker_id = assignPickerId;
      }

      const { error } = await supabase
        .from("pickup_requests")
        .update(updatePayload)
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Auto-create a daily route entry for picker if assigned
      const targetPickerId = assignPickerId || selectedRequest.assigned_picker_id;
      if (targetPickerId) {
        const todayDate = new Date().toISOString().split("T")[0];
        const { data: existingRoute } = await supabase
          .from("routes")
          .select("id")
          .eq("picker_id", targetPickerId)
          .eq("fbo_id", selectedRequest.fbo_id)
          .eq("route_date", todayDate)
          .maybeSingle();

        if (!existingRoute) {
          await supabase.from("routes").insert({
            picker_id: targetPickerId,
            fbo_id: selectedRequest.fbo_id,
            route_date: todayDate,
            sort_order: 1,
          });
        }
      }

      setActionSuccessMsg(
        `Pickup request for ${selectedRequest.fbo?.business_name} updated to ${newStatus.toUpperCase()}.`
      );
      setSelectedRequest(null);
      setAdminNotes("");
      setAssignPickerId("");
      fetchData();
    } catch (err: any) {
      alert("Failed to update pickup request: " + err.message);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-900">
      {/* Top Header Banner with Unified Sub-Navigation Tabs */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider">
              Logistics &amp; Verification Hub
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              FBO Pickup Requests &amp; Reviews
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage on-demand FBO collection requests, assign pickers, audit logged pickup entries, and handle closed outlet reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-xs">
              <Truck className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Primary View Switcher Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange("requests")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "requests"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <Truck className="w-4 h-4" />
            FBO Pickup Requests &amp; Dispatch
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("reviews")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "reviews"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Pickup Log Reviews &amp; Verification
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("closed")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "closed"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            Closed Outlets &amp; Exceptions
          </button>
        </div>
      </div>

      {/* VIEW CONTENT SWITCHER */}
      {activeTab === "reviews" ? (
        /* TAB 2: PICKUP LOG REVIEWS */
        <div className="animate-fade-in">
          <AdminPickupReview />
        </div>
      ) : activeTab === "closed" ? (
        /* TAB 3: CLOSED OUTLETS & EXCEPTIONS */
        <div className="animate-fade-in">
          <ExceptionsTab />
        </div>
      ) : (
        /* TAB 1: FBO PICKUP REQUESTS & DISPATCH */
        <div className="space-y-6 animate-fade-in">
          {/* KPI Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 space-y-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Requests</span>
              <p className="text-2xl font-black text-slate-900">{requests.length}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/60 bg-amber-50/20 shadow-lg shadow-amber-100/30 space-y-1">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Pending Review</span>
              <p className="text-2xl font-black text-amber-700">{pendingCount}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-blue-200/60 bg-blue-50/20 shadow-lg shadow-blue-100/30 space-y-1">
              <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">Scheduled / Assigned</span>
              <p className="text-2xl font-black text-blue-700">{scheduledCount}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200/60 bg-emerald-50/20 shadow-lg shadow-emerald-100/30 space-y-1">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Total Requested Volume</span>
              <p className="text-2xl font-black text-emerald-700">{formatLiters(totalVolumeRequested)}</p>
            </div>
          </div>

          {/* Success Alert */}
          {actionSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
              <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Filter Tabs & Search Bar */}
          <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-lg shadow-slate-200/50 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "active", label: `Active Pipeline (${pendingCount + scheduledCount})` },
                { id: "pending", label: `Pending (${pendingCount})` },
                { id: "assigned", label: `Assigned (${scheduledCount})` },
                { id: "completed", label: `Completed (${completedCount})` },
                { id: "all", label: "All" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === tab.id
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search FBO or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* REQUEST CARDS GRID */}
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-lg shadow-slate-200/50">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-bold">Loading pickup requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-lg shadow-slate-200/50 space-y-2">
              <Truck className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-black text-slate-900 text-base">No Pickup Requests Found</p>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                {searchQuery || filterStatus !== "all"
                  ? "No requests match your selected filters."
                  : "FBO partners have not submitted any oil pickup requests yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                >
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                          {req.fbo?.business_name || "FBO Partner"}
                        </span>
                        <h3 className="font-black text-slate-900 text-lg mt-1 tracking-tight">
                          {formatLiters(Number(req.estimated_liters))} UCO
                        </h3>
                      </div>

                      <span
                        className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                          req.status === "pending"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : req.status === "scheduled" || req.status === "assigned"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : req.status === "in_transit"
                            ? "bg-teal-50 text-teal-800 border-teal-200 font-black animate-pulse"
                            : req.status === "completed"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {req.status === "pending" && "Pending ⏳"}
                        {(req.status === "scheduled" || req.status === "assigned") && "Assigned 🚚"}
                        {req.status === "in_transit" && "On The Way 📍"}
                        {req.status === "completed" && "Completed ✓"}
                        {req.status === "cancelled" && "Cancelled ✖"}
                      </span>
                    </div>

                    {/* FBO Details */}
                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{req.fbo?.contact_person || "Contact N/A"}</span>
                        {req.fbo?.phone && (
                          <a href={`tel:${req.fbo.phone}`} className="text-emerald-600 hover:underline flex items-center gap-0.5 ml-auto font-mono text-[11px]">
                            <Phone className="w-3 h-3" />
                            {req.fbo.phone}
                          </a>
                        )}
                      </div>
                      {req.fbo?.address && (
                        <div className="flex items-start gap-1.5 text-[11px] text-slate-500 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{req.fbo.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Preferred Schedule & Time Slot */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Target Date</span>
                        <span className="font-extrabold text-slate-900 mt-0.5 block">{formatDate(req.preferred_date)}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Time Slot</span>
                        <span className="font-bold text-slate-900 mt-0.5 block text-[11px]">{req.preferred_time_slot}</span>
                      </div>
                    </div>

                    {/* Assigned Picker info if any */}
                    {req.picker?.profile?.full_name && (
                      <div className="text-xs font-bold text-slate-800 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div>
                          <span className="text-[9px] font-extrabold text-blue-800 uppercase tracking-wider block">Assigned Picker</span>
                          <span>{req.picker.profile.full_name}</span>
                        </div>
                      </div>
                    )}

                    {/* FBO Notes */}
                    {req.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        &ldquo;{req.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Action Toolbar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">
                      {formatDate(req.created_at)}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequest(req);
                        setAssignPickerId(req.assigned_picker_id || "");
                        setAdminNotes(req.admin_notes || "");
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Manage Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MANAGE REQUEST MODAL */}
          {selectedRequest && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4 relative">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                      {selectedRequest.fbo?.business_name}
                    </span>
                    <h3 className="font-black text-slate-900 text-lg">Manage Pickup Request</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="text-slate-400 hover:text-slate-700 p-1 font-bold cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Request Summary Box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Requested Volume:</span>
                    <span className="font-black text-slate-900 text-sm">{formatLiters(Number(selectedRequest.estimated_liters))} UCO</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Target Pickup Date:</span>
                    <span>{formatDate(selectedRequest.preferred_date)} ({selectedRequest.preferred_time_slot})</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>FBO Address:</span>
                    <span className="text-right text-slate-600 max-w-[60%]">{selectedRequest.fbo?.address || "Address N/A"}</span>
                  </div>
                </div>

                {/* Form Controls */}
                <div className="space-y-4">
                  {/* Select Picker */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Assign Picker / Driver
                    </label>
                    <select
                      value={assignPickerId}
                      onChange={(e) => setAssignPickerId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Unassigned --</option>
                      {pickers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.profile?.full_name || "Picker"} ({p.vehicle_info || "No Vehicle Info"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Admin Internal Notes / Dispatch Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="e.g. Dispatched for 10:30 AM pickup."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateRequestStatus("cancelled")}
                      disabled={updating}
                      className="px-3.5 py-2 text-xs text-rose-700 hover:bg-rose-50 font-extrabold rounded-xl transition-all border border-rose-200 cursor-pointer"
                    >
                      Cancel Request
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateRequestStatus("assigned")}
                        disabled={updating}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-3.5 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                        Assign
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateRequestStatus("in_transit")}
                        disabled={updating}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs py-2.5 px-3.5 rounded-xl shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                        On The Way
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateRequestStatus("completed")}
                        disabled={updating}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-3.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Completed
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPickupRequestsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500 text-sm font-bold">Loading Pickup Hub...</div>}>
      <PickupRequestsHubContent />
    </Suspense>
  );
}
