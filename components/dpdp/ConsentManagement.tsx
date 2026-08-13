"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearUnconsentedPwaStorage } from "@/lib/pwa-consent-cleaner";
import { Shield, Check, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

interface UserConsentState {
  essential_consent: boolean;
  telemetry_consent: boolean;
  pwa_storage_consent: boolean;
  marketing_consent: boolean;
}

/**
 * DPDP Act 2023 - Section 6 Compliant Consent Management Component
 * - Itemized, un-ticked granular choices for non-essential processing
 * - One-click consent withdrawal mechanism
 * - Triggers offline storage purging when PWA consent is revoked
 */
export default function ConsentManagement() {
  const [consents, setConsents] = useState<UserConsentState>({
    essential_consent: true, // Mandatory for app functionality
    telemetry_consent: false,
    pwa_storage_consent: false,
    marketing_consent: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserConsents() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("user_consents")
            .select("essential_consent, telemetry_consent, pwa_storage_consent, marketing_consent")
            .eq("user_id", user.id)
            .maybeSingle();

          if (data) {
            setConsents({
              essential_consent: true,
              telemetry_consent: !!data.telemetry_consent,
              pwa_storage_consent: !!data.pwa_storage_consent,
              marketing_consent: !!data.marketing_consent,
            });
          }
        }
      } catch (err) {
        console.error("[DPDP] Error fetching consents:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUserConsents();
  }, []);

  const handleToggle = (key: keyof UserConsentState) => {
    if (key === "essential_consent") return; // Essential cannot be un-ticked
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveConsentPreferences = async () => {
    setSaving(true);
    setStatusMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatusMessage("Please sign in to update consent preferences.");
        setSaving(false);
        return;
      }

      // If PWA storage consent is turned OFF, execute DPDP Data Minimization purge
      if (!consents.pwa_storage_consent) {
        await clearUnconsentedPwaStorage();
      }

      const { error } = await supabase.from("user_consents").upsert({
        user_id: user.id,
        essential_consent: true,
        telemetry_consent: consents.telemetry_consent,
        pwa_storage_consent: consents.pwa_storage_consent,
        marketing_consent: consents.marketing_consent,
        consented_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setStatusMessage("Consent preferences updated successfully.");
    } catch (err: any) {
      console.error("[DPDP] Save error:", err);
      setStatusMessage(`Error saving preferences: ${err.message || "Failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const withdrawAllNonEssentialConsent = async () => {
    setSaving(true);
    try {
      const resetConsents = {
        essential_consent: true,
        telemetry_consent: false,
        pwa_storage_consent: false,
        marketing_consent: false,
      };
      setConsents(resetConsents);

      // Execute offline data purge
      await clearUnconsentedPwaStorage();

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_consents").upsert({
          user_id: user.id,
          ...resetConsents,
          withdrawn_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      setStatusMessage("All non-essential consents revoked and offline tracking data purged.");
    } catch (err: any) {
      setStatusMessage("Failed to withdraw consents.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex justify-center items-center gap-2 text-xs text-gray-500 font-bold">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-700" /> Loading privacy preferences...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-700" />
            DPDP Privacy & Consent Controls
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Manage or withdraw your consent for personal data processing under DPDP Act 2023.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. Essential Processing (Mandatory) */}
        <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              Essential Account Operations <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Required</span>
            </span>
            <p className="text-[11px] text-gray-500 font-medium">
              Necessary for account login, route assignment, and UCO pickup verification.
            </p>
          </div>
          <input
            type="checkbox"
            checked={true}
            disabled={true}
            className="w-5 h-5 accent-emerald-700 rounded border-gray-300 cursor-not-allowed opacity-60"
          />
        </div>

        {/* 2. PWA Storage & Offline Cache Consent */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 hover:border-emerald-300 transition-colors flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <span className="text-xs font-bold text-gray-900">
              Offline PWA Storage & Manifest Caching
            </span>
            <p className="text-[11px] text-gray-500 font-medium">
              Allows saving route manifests locally for offline pickup logging. If disabled, cache will be purged immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle("pwa_storage_consent")}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              consents.pwa_storage_consent ? "bg-emerald-600 justify-end" : "bg-gray-300 justify-start"
            }`}
          >
            <span className="w-4 h-4 bg-white rounded-full shadow-md" />
          </button>
        </div>

        {/* 3. Operational Telemetry & Analytics */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 hover:border-emerald-300 transition-colors flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <span className="text-xs font-bold text-gray-900">
              Operational Performance & Telemetry
            </span>
            <p className="text-[11px] text-gray-500 font-medium">
              Anonymous app diagnostic logs to help improve app reliability and route speed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle("telemetry_consent")}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              consents.telemetry_consent ? "bg-emerald-600 justify-end" : "bg-gray-300 justify-start"
            }`}
          >
            <span className="w-4 h-4 bg-white rounded-full shadow-md" />
          </button>
        </div>

        {/* 4. Marketing & Portal Communication */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 hover:border-emerald-300 transition-colors flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <span className="text-xs font-bold text-gray-900">
              Service Updates & Operational Alerts
            </span>
            <p className="text-[11px] text-gray-500 font-medium">
              Receive notifications for price updates, new route assignments, and payouts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle("marketing_consent")}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              consents.marketing_consent ? "bg-emerald-600 justify-end" : "bg-gray-300 justify-start"
            }`}
          >
            <span className="w-4 h-4 bg-white rounded-full shadow-md" />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-700" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          type="button"
          onClick={saveConsentPreferences}
          disabled={saving}
          className="w-full sm:w-auto px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Save Consent Preferences
        </button>

        <button
          type="button"
          onClick={withdrawAllNonEssentialConsent}
          disabled={saving}
          className="w-full sm:w-auto px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-2xl border border-rose-200 transition-all flex items-center justify-center gap-1.5"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          Withdraw All Non-Essential Consents
        </button>
      </div>
    </div>
  );
}
