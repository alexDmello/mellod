"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/client";
import { CreditCard, Building2, Smartphone, Banknote, Plus, CheckCircle2, Trash2, Loader2, Star } from "lucide-react";
import type { PaymentMethod, PaymentMethodType } from "@/lib/types";

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
  bank: <Building2 className="w-4 h-4" />,
  upi: <Smartphone className="w-4 h-4" />,
  cash: <Banknote className="w-4 h-4" />,
};

const methodLabels: Record<PaymentMethodType, string> = {
  bank: "Bank Transfer",
  upi: "UPI",
  cash: "Cash",
};

export default function PaymentPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [fboId, setFboId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bank" | "upi">("upi");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const bankForm = useForm<BankForm>({ resolver: zodResolver(bankSchema), defaultValues: { method_type: "bank" } });
  const upiForm = useForm<UPIForm>({ resolver: zodResolver(upiSchema), defaultValues: { method_type: "upi" } });

  useEffect(() => { fetchPaymentMethods(); }, []);

  async function fetchPaymentMethods() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: fbo } = await supabase.from("fbos").select("id").eq("profile_id", user.id).single();
    if (!fbo) return;

    setFboId(fbo.id);
    const { data } = await supabase.from("payment_methods").select("*").eq("fbo_id", fbo.id).order("is_primary", { ascending: false });
    setPaymentMethods(data ?? []);
    setFetching(false);
  }

  async function setPrimary(id: string) {
    if (!fboId) return;
    await supabase.from("payment_methods").update({ is_primary: false }).eq("fbo_id", fboId);
    await supabase.from("payment_methods").update({ is_primary: true }).eq("id", id);
    await fetchPaymentMethods();
  }

  async function deleteMethod(id: string) {
    await supabase.from("payment_methods").delete().eq("id", id);
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
  }

  async function submitBank(data: BankForm) {
    if (!fboId) return;
    setLoading(true);
    await supabase.from("payment_methods").insert({
      fbo_id: fboId,
      method_type: "bank",
      account_holder: data.account_holder,
      bank_name: data.bank_name,
      account_number: data.account_number,
      ifsc_code: data.ifsc_code.toUpperCase(),
      is_primary: paymentMethods.length === 0,
    });
    bankForm.reset();
    setSuccess(true);
    setShowForm(false);
    await fetchPaymentMethods();
    setTimeout(() => setSuccess(false), 3000);
    setLoading(false);
  }

  async function submitUPI(data: UPIForm) {
    if (!fboId) return;
    setLoading(true);
    await supabase.from("payment_methods").insert({
      fbo_id: fboId,
      method_type: "upi",
      upi_id: data.upi_id,
      is_primary: paymentMethods.length === 0,
    });
    upiForm.reset();
    setSuccess(true);
    setShowForm(false);
    await fetchPaymentMethods();
    setTimeout(() => setSuccess(false), 3000);
    setLoading(false);
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-green-700 px-4 pt-4 pb-8">
        <h1 className="text-white text-xl font-bold">Payment Methods</h1>
        <p className="text-green-200 text-sm mt-0.5">How you receive your UCO earnings</p>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-4">
        {success && (
          <div className="card p-3 flex items-center gap-2 border border-green-200 bg-green-50 text-green-700 text-sm animate-slide-up">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Payment method saved successfully!
          </div>
        )}

        {/* Existing methods */}
        {!fetching && paymentMethods.length > 0 && (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div key={method.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${method.is_primary ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {methodIcons[method.method_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 text-sm">{methodLabels[method.method_type]}</p>
                      {method.is_primary && <span className="badge badge-green">Primary</span>}
                    </div>

                    {method.method_type === "bank" && (
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-xs text-gray-600">{method.account_holder} · {method.bank_name}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          ···· {method.account_number?.slice(-4)} · {method.ifsc_code}
                        </p>
                      </div>
                    )}
                    {method.method_type === "upi" && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">{method.upi_id}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {!method.is_primary && (
                      <button
                        onClick={() => setPrimary(method.id)}
                        className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors"
                        title="Set as primary"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMethod(method.id)}
                      className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!fetching && paymentMethods.length === 0 && !showForm && (
          <div className="card p-8 text-center">
            <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No payment methods yet</p>
            <p className="text-gray-400 text-sm mt-1">Add a bank account or UPI ID to receive payments.</p>
          </div>
        )}

        {/* Add form toggle */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary btn-full"
          >
            <Plus className="w-4 h-4" /> Add Payment Method
          </button>
        ) : (
          <div className="card p-4">
            <h2 className="font-semibold text-gray-800 mb-4">Add New Method</h2>

            {/* Tab selector */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-4">
              {(["upi", "bank"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "upi" ? "UPI ID" : "Bank Account"}
                </button>
              ))}
            </div>

            {/* UPI form */}
            {activeTab === "upi" && (
              <form onSubmit={upiForm.handleSubmit(submitUPI)} className="space-y-4">
                <div>
                  <label className="form-label">UPI ID</label>
                  <input
                    className="form-input"
                    placeholder="yourname@upi"
                    {...upiForm.register("upi_id")}
                  />
                  {upiForm.formState.errors.upi_id && (
                    <p className="form-error">{upiForm.formState.errors.upi_id.message}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save UPI ID"}
                  </button>
                </div>
              </form>
            )}

            {/* Bank form */}
            {activeTab === "bank" && (
              <form onSubmit={bankForm.handleSubmit(submitBank)} className="space-y-4">
                <div>
                  <label className="form-label">Account Holder Name</label>
                  <input className="form-input" placeholder="Full name on account" {...bankForm.register("account_holder")} />
                  {bankForm.formState.errors.account_holder && <p className="form-error">{bankForm.formState.errors.account_holder.message}</p>}
                </div>
                <div>
                  <label className="form-label">Bank Name</label>
                  <input className="form-input" placeholder="e.g. State Bank of India" {...bankForm.register("bank_name")} />
                  {bankForm.formState.errors.bank_name && <p className="form-error">{bankForm.formState.errors.bank_name.message}</p>}
                </div>
                <div>
                  <label className="form-label">Account Number</label>
                  <input className="form-input" type="text" inputMode="numeric" placeholder="Account number" {...bankForm.register("account_number")} />
                  {bankForm.formState.errors.account_number && <p className="form-error">{bankForm.formState.errors.account_number.message}</p>}
                </div>
                <div>
                  <label className="form-label">IFSC Code</label>
                  <input className="form-input uppercase" placeholder="SBIN0001234" {...bankForm.register("ifsc_code")} />
                  {bankForm.formState.errors.ifsc_code && <p className="form-error">{bankForm.formState.errors.ifsc_code.message}</p>}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Bank Details"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
