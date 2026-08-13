"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Phone, Clock, ShieldCheck, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

/**
 * DPDP Act 2023 - Section 13 Compliant Grievance Redressal Component
 * Displays Data Protection Officer (DPO) contact details, 7-day resolution SLA,
 * and an interactive complaint registration form.
 */
export default function GrievanceRedressal() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("consent_withdrawal");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("dpdp_grievances").insert({
        user_id: user?.id || null,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        category,
        description: description.trim(),
      });

      if (error) throw error;

      setStatusMessage({
        text: "Grievance submitted successfully. Ticket ID generated. Our DPO will respond within 7 business days.",
        type: "success",
      });
      setFullName("");
      setEmail("");
      setPhone("");
      setDescription("");
    } catch (err: any) {
      console.error("[DPDP Grievance Error]:", err);
      setStatusMessage({
        text: err.message || "Failed to submit grievance. Please email dpo@mellod.in directly.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            Data Protection Officer & Grievance Redressal
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Pursuant to Section 13 of the Digital Personal Data Protection Act, 2023.
          </p>
        </div>
      </div>

      {/* DPO Contact Information Card */}
      <div className="p-4 bg-emerald-950 text-white rounded-2xl space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
            Designated Data Protection Officer (DPO)
          </span>
          <span className="px-2.5 py-0.5 bg-emerald-800 text-emerald-100 text-[10px] font-bold rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-300" /> 7-Day SLA Response Guarantee
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-emerald-300 font-semibold">Official Email</div>
              <div className="font-bold">dpo@mellod.in</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-emerald-300 font-semibold">Direct Desk</div>
              <div className="font-bold">+91 (080) 4567-8900</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-emerald-300 font-semibold">Grievance Escalation</div>
              <div className="font-bold">Mellod Privacy Cell, IN</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Grievance Form */}
      <div className="space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
          File a Data Privacy Grievance
        </h4>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fade-in ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmitGrievance} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-extrabold text-gray-600 block mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-gray-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-gray-600 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@example.com"
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-gray-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-gray-600 block mb-1">
                Grievance Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-gray-900"
              >
                <option value="consent_withdrawal">Consent Withdrawal Issue</option>
                <option value="data_correction">Data Correction Request</option>
                <option value="data_export">Data Export Technical Issue</option>
                <option value="unauthorized_processing">Unauthorized Data Processing</option>
                <option value="other">Other Privacy Concern</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-gray-600 block mb-1">
              Grievance Description
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific details of your grievance under DPDP Act rules..."
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit Grievance to DPO
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
