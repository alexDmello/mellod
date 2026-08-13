"use client";

import React, { useState } from "react";
import { ShieldCheck, FileText, Lock, ChevronDown, ChevronUp, AlertCircle, PhoneCall } from "lucide-react";

/**
 * DPDP Act 2023 - Section 5 Compliant Privacy Notice Component
 * - Itemized details on personal data processed (Name, Phone, UCO Pickup History, Location, Payment Info)
 * - Specific purposes of processing
 * - Rights of the Data Principal
 * - Right to withdraw consent and grievance redressal contact
 */
export default function PrivacyNotice() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full bg-emerald-950/5 border border-emerald-900/10 rounded-2xl p-4 text-xs font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-600/10 text-emerald-700 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-gray-900">Digital Personal Data Protection Notice</h4>
            <p className="text-[11px] text-gray-500 font-medium">
              Compliant with India&apos;s DPDP Act, 2023
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 bg-emerald-700 text-white font-bold text-[11px] rounded-xl hover:bg-emerald-800 transition-colors flex items-center gap-1"
        >
          {isOpen ? (
            <>
              Hide Details <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Read Notice <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-emerald-900/10 space-y-4 text-gray-700 animate-fade-in">
          {/* Summary Box */}
          <div className="p-3 bg-white rounded-xl border border-emerald-100 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] leading-relaxed text-gray-600">
              Mellod (&quot;Data Fiduciary&quot;) processes your personal data strictly to facilitate Used Cooking Oil (UCO) pickup collection, statutory compliance, and payment settlement under the Digital Personal Data Protection Act, 2023.
            </p>
          </div>

          {/* Itemized Categories of Data & Processing Purposes */}
          <div className="space-y-3">
            <h5 className="font-extrabold text-gray-900 uppercase tracking-wider text-[10px]">
              Itemized Processing Purposes & Data Collected
            </h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-1">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Account & Profile Info
                </div>
                <p className="text-gray-600">Full Name, Phone Number, Assigned Username, Business Address.</p>
                <p className="text-[10px] text-gray-400 italic">Purpose: Identity verification and pickup routing.</p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-1">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Financial & Settlement Details
                </div>
                <p className="text-gray-600">Bank Account Number, IFSC Code, UPI ID (FBO Partners only).</p>
                <p className="text-[10px] text-gray-400 italic">Purpose: Automated payout settlement for collected UCO.</p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-1">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Geolocation & Pickup Logs
                </div>
                <p className="text-gray-600">GPS Coordinates during pickup logging and pickup photos.</p>
                <p className="text-[10px] text-gray-400 italic">Purpose: Verifying UCO chain of custody & route optimization.</p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-1">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5" /> Offline PWA Cache
                </div>
                <p className="text-gray-600">Temporary route manifests stored locally on device.</p>
                <p className="text-[10px] text-gray-400 italic">Purpose: Facilitating offline collection log entries.</p>
              </div>
            </div>
          </div>

          {/* Data Principal Rights Summary */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/50 space-y-1.5">
            <div className="font-extrabold text-emerald-950 text-[11px]">
              Your Rights as a Data Principal (Section 11 - 14):
            </div>
            <ul className="list-disc list-inside text-[11px] text-emerald-900 space-y-1 font-medium">
              <td><strong>Right to Access:</strong> Request a full export of your personal data stored on Mellod.</td>
              <td><strong>Right to Correction:</strong> Update outdated personal details or financial information.</td>
              <td><strong>Right to Erasure:</strong> Withdraw consent and request complete deletion of your account.</td>
              <td><strong>Grievance Redressal:</strong> Contact our Data Protection Officer at dpo@mellod.in for resolution within 7 days.</td>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
