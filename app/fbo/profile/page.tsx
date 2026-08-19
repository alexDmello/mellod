"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Phone,
  MapPin,
  ShieldCheck,
  CreditCard,
  Building,
  Smartphone,
  Banknote,
  Plus,
  CheckCircle2,
  Trash2,
  Loader2,
  Star,
  FileCheck,
  Edit3,
  LogOut,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import type { PaymentMethod, PaymentMethodType, FBO } from "@/lib/types";
import { useRouter } from "next/navigation";

// Validation Schemas
const bankSchema = z.object({
  method_type: z.literal("bank"),
  account_holder: z.string().min(2, "Account holder name required"),
  bank_name: z.string().min(2, "Bank name required"),
  account_number: z.string().min(8, "Valid account number required"),
  ifsc_code: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code (e.g. SBIN0001234)"),
});

const upiSchema = z.object({
  method_type: z.literal("upi"),
  upi_id: z.string().min(3, "UPI ID required").includes("@", { message: "Must contain @" }),
});

type BankForm = z.infer<typeof bankSchema>;
type UPIForm = z.infer<typeof upiSchema>;

const methodIcons: Record<PaymentMethodType, React.ReactNode> = {
  bank: <Building className="w-4 h-4" />,
  upi: <Smartphone className="w-4 h-4" />,
  cash: <Banknote className="w-4 h-4" />,
};

const methodLabels: Record<PaymentMethodType, string> = {
  bank: "Bank Transfer",
  upi: "UPI ID",
  cash: "Cash",
};

import FBOHeader from "@/components/FBOHeader";
import FBOProfileLoading from "./loading";

export default function FBOProfilePage() {
  const [fbo, setFbo] = useState<FBO | null>(null);
  const [fssaiLicense, setFssaiLicense] = useState<string>("");
  const [isEditingFssai, setIsEditingFssai] = useState(false);
  const [savingFssai, setSavingFssai] = useState(false);
  const [fssaiSuccess, setFssaiSuccess] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [activeTab, setActiveTab] = useState<"upi" | "bank">("upi");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const bankForm = useForm<BankForm>({ resolver: zodResolver(bankSchema), defaultValues: { method_type: "bank" } });
  const upiForm = useForm<UPIForm>({ resolver: zodResolver(upiSchema), defaultValues: { method_type: "upi" } });

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    setFetching(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch FBO Profile
    const { data: fboData } = await supabase.from("fbos").select("*").eq("profile_id", user.id).single();
    if (fboData) {
      setFbo(fboData);
      setFssaiLicense(fboData.fssai_license || "");
    }

    // Fetch Payment Methods
    if (fboData?.id) {
      const { data: pmData } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("fbo_id", fboData.id)
        .order("is_primary", { ascending: false });
      setPaymentMethods(pmData ?? []);
    }

    setFetching(false);
  }

  // Save FSSAI License update
  async function handleSaveFssai() {
    if (!fbo?.id) return;
    setSavingFssai(true);
    const { error } = await supabase
      .from("fbos")
      .update({ fssai_license: fssaiLicense.trim() || null })
      .eq("id", fbo.id);

    if (error) {
      console.error("Failed to save FSSAI license:", error);
      alert("Database error saving FSSAI license: " + error.message);
      setSavingFssai(false);
      return;
    }

    setFbo((prev) => (prev ? { ...prev, fssai_license: fssaiLicense.trim() || null } : null));
    setSavingFssai(false);
    setIsEditingFssai(false);
    setFssaiSuccess(true);
    setTimeout(() => setFssaiSuccess(false), 3000);
  }

  // Payment method actions
  async function setPrimary(id: string) {
    if (!fbo?.id) return;
    await supabase.from("payment_methods").update({ is_primary: false }).eq("fbo_id", fbo.id);
    await supabase.from("payment_methods").update({ is_primary: true }).eq("id", id);
    await fetchProfileData();
  }

  async function deleteMethod(id: string) {
    await supabase.from("payment_methods").delete().eq("id", id);
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
  }

  async function submitBank(data: BankForm) {
    if (!fbo?.id) return;
    setLoading(true);
    await supabase.from("payment_methods").insert({
      fbo_id: fbo.id,
      method_type: "bank",
      account_holder: data.account_holder,
      bank_name: data.bank_name,
      account_number: data.account_number,
      ifsc_code: data.ifsc_code.toUpperCase(),
      is_primary: paymentMethods.length === 0,
    });
    bankForm.reset();
    setPaymentSuccess(true);
    setShowForm(false);
    await fetchProfileData();
    setTimeout(() => setPaymentSuccess(false), 3000);
    setLoading(false);
  }

  async function submitUPI(data: UPIForm) {
    if (!fbo?.id) return;
    setLoading(true);
    await supabase.from("payment_methods").insert({
      fbo_id: fbo.id,
      method_type: "upi",
      upi_id: data.upi_id,
      is_primary: paymentMethods.length === 0,
    });
    upiForm.reset();
    setPaymentSuccess(true);
    setShowForm(false);
    await fetchProfileData();
    setTimeout(() => setPaymentSuccess(false), 3000);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (fetching) {
    return <FBOProfileLoading />;
  }

  return (
    <div className="animate-fade-in space-y-5 pb-8 font-sans text-slate-900">
      {/* Modern Unified Header */}
      <FBOHeader subtitle="FBO Partner Portal">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white text-emerald-700 font-black text-xl flex items-center justify-center border border-emerald-100 shadow-md">
            {fbo?.business_name?.charAt(0) || "F"}
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white drop-shadow-sm">{fbo?.business_name}</h1>
            <p className="text-emerald-100 text-xs mt-0.5 font-semibold">Partner Profile & Payout Preferences</p>
          </div>
        </div>
      </FBOHeader>

      <div className="px-4 -mt-6 relative z-10 space-y-4">
        {/* ── SECTION 1: Business Details & FSSAI License ────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/50 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Business & Regulatory Details
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] uppercase font-bold tracking-wider border border-emerald-200">
              Verified Partner
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-bold text-[10px] uppercase">Contact Person</span>
              <span className="font-black text-slate-900 text-sm mt-0.5 block">{fbo?.contact_person || "—"}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Phone Number</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> {fbo?.phone || "Not provided"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Pickup Location Address</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">{fbo?.address || "Address configured"}</span>
                </span>
              </div>
            </div>

            {/* FSSAI License Row */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-900 font-bold block flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    FSSAI License / Registration No.
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">Used Cooking Oil regulatory compliance identifier</p>
                </div>

                {!fbo?.fssai_license && !isEditingFssai && (
                  <button
                    onClick={() => setIsEditingFssai(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                  >
                    + Add FSSAI
                  </button>
                )}
              </div>

              {isEditingFssai ? (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Enter 14-digit FSSAI license no..."
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={fssaiLicense}
                    onChange={(e) => setFssaiLicense(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsEditingFssai(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 font-bold rounded-xl hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveFssai}
                      disabled={savingFssai || !fssaiLicense.trim()}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {savingFssai ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save & Lock"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  {fbo?.fssai_license ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="bg-white text-slate-900 font-mono text-xs px-2.5 py-0.5 rounded-md font-extrabold border border-slate-200 shadow-xs">
                            {fbo.fssai_license}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-800 font-extrabold flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                          Verified & Locked ✓
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic font-medium">
                        Contact your administrator to request updates.
                      </p>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs italic font-medium">
                      No FSSAI license added yet. Click "+ Add FSSAI" above to register license details.
                    </span>
                  )}
                </div>
              )}

              {fssaiSuccess && (
                <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> FSSAI license registered & locked successfully!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION 2: Payment & Payout Options ────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/50 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Payout Payment Methods
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Bank details and UPI accounts configured for receiving earnings</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] uppercase font-bold tracking-wider border border-slate-200">
              Admin Managed
            </span>
          </div>

          {/* Existing payment methods list */}
          {paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div key={method.id} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                        method.is_primary ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                      }`}
                    >
                      {methodIcons[method.method_type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-extrabold text-slate-900 text-xs">{methodLabels[method.method_type]}</p>
                        {method.is_primary && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase border border-emerald-200">
                            Primary Payout
                          </span>
                        )}
                      </div>

                      {method.method_type === "bank" && (
                        <div className="mt-1 space-y-0.5 text-xs text-slate-600 font-medium">
                          <p className="text-slate-900 font-bold">{method.account_holder} · {method.bank_name}</p>
                          <p className="font-mono text-[11px] text-slate-500">
                            ···· {method.account_number?.slice(-4)} · IFSC: {method.ifsc_code}
                          </p>
                        </div>
                      )}
                      {method.method_type === "upi" && (
                        <p className="text-xs text-slate-900 mt-1 font-mono font-black">{method.upi_id}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 space-y-2 p-4">
              <CreditCard className="w-8 h-8 text-emerald-600/50 mx-auto" />
              <p className="text-xs text-slate-800 font-bold">No payout method assigned yet</p>
              <p className="text-[11px] text-slate-500 font-medium max-w-sm mx-auto">
                Payout payment methods are managed centrally by your administrator. Contact support if you need to update your payout account.
              </p>
            </div>
          )}
        </div>

        {/* ── SECTION 3: Support Desk ───────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/50 space-y-3 text-xs">
          <h2 className="font-black text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            Support & Assistance
          </h2>

          <a
            href="tel:+919876543210"
            className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold transition-colors shadow-xs"
          >
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              Mellod Biofuels Support Line
            </span>
            <ExternalLink className="w-4 h-4 text-emerald-600" />
          </a>
        </div>

        {/* ── SECTION 4: Account Session & Sign Out ───────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/50 space-y-3 text-xs">
          <h2 className="font-black text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <LogOut className="w-4 h-4 text-rose-500" />
            Account Session
          </h2>

          <button
            onClick={handleLogout}
            className="w-full py-3 flex items-center justify-center gap-2 text-xs font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            Sign Out of Partner Account
          </button>
        </div>
      </div>
    </div>
  );
}
