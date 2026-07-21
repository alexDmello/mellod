"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatLiters, formatDate } from "@/lib/utils";
import {
  CheckCircle2, AlertCircle, Edit3, Trash2, Camera,
  Droplets, Loader2, X, Eye, RefreshCw, Filter
} from "lucide-react";

interface PickupItem {
  id: string;
  liters: number;
  price_per_liter: number;
  total_amount: number;
  photo_url: string | null;
  notes: string | null;
  status: "pending" | "completed" | "disputed";
  picked_up_at: string;
  fbo: {
    business_name: string;
    address: string | null;
  };
  picker: {
    vehicle_info: string | null;
    profile: {
      full_name: string;
    };
  };
}

export default function AdminPickupReview() {
  const [pickups, setPickups] = useState<PickupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "completed" | "all">("pending");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable fields local state
  const [editState, setEditState] = useState<Record<string, { liters: string; price: string; notes: string }>>({});

  const supabase = createClient();

  useEffect(() => {
    fetchPickups();
  }, [statusFilter]);

  async function fetchPickups() {
    setLoading(true);
    try {
      let query = supabase
        .from("pickups")
        .select(`
          id, liters, price_per_liter, total_amount, photo_url, notes, status, picked_up_at,
          fbo:fbos(business_name, address),
          picker:pickers(vehicle_info, profile:profiles(full_name))
        `)
        .order("picked_up_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const items = (data as unknown as PickupItem[]) || [];
      setPickups(items);

      // Initialize edit state mapping
      const initialEdits: Record<string, { liters: string; price: string; notes: string }> = {};
      items.forEach((p) => {
        initialEdits[p.id] = {
          liters: p.liters.toString(),
          price: p.price_per_liter.toString(),
          notes: p.notes || "",
        };
      });
      setEditState(initialEdits);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to load pickups for review." });
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(id: string, field: "liters" | "price" | "notes", val: string) {
    setEditState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: val,
      },
    }));
  }

  async function handleApprove(pickupId: string, targetStatus: "completed" | "pending" = "completed") {
    const editData = editState[pickupId];
    if (!editData) return;

    setSavingId(pickupId);
    setMessage(null);

    try {
      const res = await fetch("/api/pickup/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupId,
          liters: parseFloat(editData.liters || "0"),
          price_per_liter: parseFloat(editData.price || "0"),
          notes: editData.notes,
          status: targetStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update pickup review.");
      }

      setMessage({
        type: "success",
        text: targetStatus === "completed" ? "Pickup reviewed & approved successfully!" : "Pickup saved.",
      });

      await fetchPickups();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(pickupId: string) {
    if (!confirm("Are you sure you want to delete this pickup record?")) return;

    setSavingId(pickupId);
    try {
      const res = await fetch(`/api/pickup/review?pickupId=${pickupId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.error || "Delete failed.");

      setMessage({ type: "success", text: "Pickup record removed." });
      await fetchPickups();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingId(null);
    }
  }

  const pendingCount = pickups.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-bold">
            {pendingCount}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base">Pickup Log Reviews</h2>
            <p className="text-xs text-gray-500">
              Review picker submissions, edit liters/notes if needed, and confirm payouts.
            </p>
          </div>
        </div>

        {/* Status Filter buttons */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 p-1 text-xs">
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pending Review
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                statusFilter === "completed"
                  ? "bg-green-700 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                statusFilter === "all"
                  ? "bg-gray-800 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All Logs
            </button>
          </div>

          <button
            onClick={() => fetchPickups()}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* List of Pickups for Review */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-green-700" />
          <span>Loading pickups...</span>
        </div>
      ) : pickups.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 bg-white">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No {statusFilter} pickups requiring review.</p>
          <p className="text-xs text-gray-400 mt-1">All collection logs are verified and up to date.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pickups.map((p) => {
            const edit = editState[p.id] || {
              liters: p.liters.toString(),
              price: p.price_per_liter.toString(),
              notes: p.notes || "",
            };

            const computedLiters = parseFloat(edit.liters || "0");
            const computedPrice = parseFloat(edit.price || "0");
            const computedTotal = computedLiters * computedPrice;

            return (
              <div
                key={p.id}
                className={`card p-5 bg-white border transition-all ${
                  p.status === "pending"
                    ? "border-amber-200 shadow-md ring-1 ring-amber-100"
                    : "border-gray-100"
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left Column: Photo preview */}
                  <div className="lg:col-span-3 flex flex-col items-center">
                    {p.photo_url ? (
                      <div
                        onClick={() => setSelectedPhoto(p.photo_url)}
                        className="relative group cursor-pointer w-full h-36 rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.photo_url}
                          alt="Pickup verification"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                          <Eye className="w-4 h-4" /> Enlarge Photo
                        </div>
                        <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md">
                          Uploaded Photo
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-36 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 text-xs">
                        <Camera className="w-6 h-6 mb-1" />
                        <span>No photo attached</span>
                      </div>
                    )}
                  </div>

                  {/* Middle Column: FBO & Picker details */}
                  <div className="lg:col-span-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`badge text-xs ${
                          p.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {p.status === "pending" ? "Pending Review" : "Approved"}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(p.picked_up_at)}</span>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-tight">
                        {p.fbo?.business_name || "Unknown FBO"}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">{p.fbo?.address || "No address specified"}</p>
                    </div>

                    <div className="pt-1 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">Picker:</span>{" "}
                      {p.picker?.profile?.full_name || "Assigned Picker"}
                      {p.picker?.vehicle_info && ` (${p.picker.vehicle_info})`}
                    </div>
                  </div>

                  {/* Right Column: Editable fields (Liters, Price, Notes, Total) */}
                  <div className="lg:col-span-5 bg-gray-50 p-4 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Liters Collected
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            className="form-input !py-1.5 !px-3 text-sm font-bold bg-white"
                            value={edit.liters}
                            onChange={(e) => handleInputChange(p.id, "liters", e.target.value)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            L
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Price per Liter
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="form-input !py-1.5 !px-3 text-sm font-bold bg-white"
                            value={edit.price}
                            onChange={(e) => handleInputChange(p.id, "price", e.target.value)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            ₹
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1 block">
                        Admin / Picker Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Add or adjust notes..."
                        className="form-input !py-1.5 !px-3 text-xs bg-white"
                        value={edit.notes}
                        onChange={(e) => handleInputChange(p.id, "notes", e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div>
                        <span className="text-xs text-gray-500">Calculated Payout:</span>
                        <span className="ml-2 font-bold text-gray-900 text-sm">
                          {formatCurrency(computedTotal)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={savingId === p.id}
                          className="btn btn-danger btn-sm !py-1.5 !px-2.5 text-xs"
                          title="Delete Pickup Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleApprove(p.id, p.status === "pending" ? "completed" : "completed")}
                          disabled={savingId === p.id}
                          className={`btn btn-sm !py-1.5 !px-3 text-xs flex items-center gap-1 font-semibold ${
                            p.status === "pending" ? "btn-primary" : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {savingId === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {p.status === "pending" ? "Approve Pickup" : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for full resolution photo inspection */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
              <span className="text-sm font-semibold">Verification Photo</span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto}
                alt="Enlarged verification photo"
                className="max-h-[80vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
