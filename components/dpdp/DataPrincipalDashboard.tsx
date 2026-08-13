"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Download,
  Trash2,
  Edit3,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

interface ProfileProps {
  initialProfile?: {
    full_name: string;
    phone: string | null;
    role: string;
    username: string;
  };
}

/**
 * DPDP Act 2023 - Section 11, 12 Compliant Data Principal Dashboard Component
 * Implements:
 * 1. "Request Data Export" (Right to Access - Section 11)
 * 2. "Update Personal Details" (Right to Correction - Section 11)
 * 3. "Delete My Account / Erase Data" (Right to Erasure - Section 12)
 */
export default function DataPrincipalDashboard({ initialProfile }: ProfileProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialProfile?.full_name || "");
  const [phone, setPhone] = useState(initialProfile?.phone || "");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 1. Update Personal Details (DPDP Section 11 - Right to Correction)
  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authenticated user session not found.");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage({ text: "Personal details updated successfully.", type: "success" });
      setIsEditing(false);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update details.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 2. Request Data Export (DPDP Section 11 - Right to Access)
  const handleExportData = async () => {
    setExporting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dpdp/export-data", {
        method: "GET",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Export failed");
      }

      const dataBlob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `mellod_dpdp_data_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage({ text: "Personal data payload exported successfully.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to export personal data.", type: "error" });
    } finally {
      setExporting(false);
    }
  };

  // 3. Complete Data Erasure (DPDP Section 12 - Right to Erasure)
  const handleEraseAccount = async () => {
    setErasing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dpdp/erase-account", {
        method: "POST",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Account erasure request failed");
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/?erased=true");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to execute account erasure.", type: "error" });
      setErasing(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-700" />
            Data Principal Account Management
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Exercise your rights under the Digital Personal Data Protection (DPDP) Act, 2023.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-700" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. UPDATE PERSONAL DETAILS FORM */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
            Personal Information (Right to Correction)
          </h4>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Details
            </button>
          )}
        </div>

        <form onSubmit={handleUpdateDetails} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-extrabold text-gray-600 block mb-1">
                Full Name
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-75 disabled:bg-gray-100 text-gray-900"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-gray-600 block mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                disabled={!isEditing}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-75 disabled:bg-gray-100 text-gray-900"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {/* 2. DATA PORTABILITY & ERASURE ACTION BUTTONS */}
      <div className="pt-4 border-t border-gray-100 space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
          Data Principal Actions
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Request Data Export Button */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2 flex flex-col justify-between">
            <div>
              <div className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-700" /> Request Data Export
              </div>
              <p className="text-[11px] text-gray-600 mt-1 leading-snug">
                Download a machine-readable JSON copy of your personal data, profile, and logs under Section 11.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportData}
              disabled={exporting}
              className="mt-2 w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Payload...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Download Export Payload
                </>
              )}
            </button>
          </div>

          {/* Delete Account / Erase Data Button */}
          <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-2 flex flex-col justify-between">
            <div>
              <div className="font-extrabold text-xs text-rose-950 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-700" /> Delete Account / Erase Data
              </div>
              <p className="text-[11px] text-gray-600 mt-1 leading-snug">
                Permanently anonymize personal identifiers and erase your account data under Section 12.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="mt-2 w-full py-2.5 px-3 bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Request Complete Erasure
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR ERASURE */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="p-2.5 bg-rose-100 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-gray-900">Confirm Permanent Erasure</h4>
                <p className="text-xs text-rose-600 font-bold">DPDP Act Section 12 Right to Erasure</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              Are you sure you want to delete your account? This action will permanently remove your profile, revoke consent records, and anonymize all personal data associated with your user identity.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleEraseAccount}
                disabled={erasing}
                className="flex-1 py-3 bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {erasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Erasing...
                  </>
                ) : (
                  "Yes, Erase My Data"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={erasing}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
