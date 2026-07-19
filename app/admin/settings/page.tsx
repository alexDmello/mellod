"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, History, Loader2, CheckCircle2 } from "lucide-react";

interface PriceRecord {
  id: string;
  price_per_liter: number;
  currency: string;
  effective_from: string;
  created_at: string;
}

export default function SettingsPage() {
  const [currentPrice, setCurrentPrice] = useState<PriceRecord | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [inputPrice, setInputPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchPrices();
  }, []);

  async function fetchPrices() {
    setFetching(true);
    const { data } = await supabase
      .from("daily_prices")
      .select("*")
      .order("effective_from", { ascending: false })
      .limit(10);

    if (data && data.length > 0) {
      setCurrentPrice(data[0]);
      setPriceHistory(data);
    }
    setFetching(false);
  }

  async function handleSetPrice(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(inputPrice);
    if (isNaN(price) || price <= 0) {
      setError("Please enter a valid price greater than 0.");
      return;
    }

    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("daily_prices").insert({
      price_per_liter: price,
      currency: "INR",
      set_by: user?.id ?? null,
      effective_from: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(true);
      setInputPrice("");
      await fetchPrices();
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Market Price Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set the current UCO market price. All new pickups will use this rate.
        </p>
      </div>

      {/* Current price display */}
      <div className="bg-green-700 rounded-2xl p-6 text-white">
        {fetching ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-green-300" />
            <span className="text-green-200">Loading current price...</span>
          </div>
        ) : currentPrice ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm">Current Market Price</p>
              <p className="text-4xl font-bold mt-1">
                {formatCurrency(currentPrice.price_per_liter)}
              </p>
              <p className="text-green-300 text-xs mt-1.5">per liter of UCO</p>
            </div>
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-300" />
            <div>
              <p className="text-green-200 font-medium">No price set yet</p>
              <p className="text-green-300 text-xs">Set the first market price below</p>
            </div>
          </div>
        )}
      </div>

      {/* Set new price form */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Update Market Price</h2>
            <p className="text-xs text-gray-500">Sets a new effective price from now</p>
          </div>
        </div>

        <form onSubmit={handleSetPrice} className="space-y-4">
          <div>
            <label htmlFor="price" className="form-label">
              New Price per Liter (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
              <input
                id="price"
                type="number"
                step="0.5"
                min="0.5"
                max="10000"
                className="form-input pl-8"
                placeholder="0.00"
                value={inputPrice}
                onChange={(e) => setInputPrice(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Price updated successfully! FBOs will see the new rate immediately.
            </div>
          )}

          <button type="submit" disabled={loading || !inputPrice} className="btn btn-primary">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><TrendingUp className="w-4 h-4" /> Set New Price</>
            )}
          </button>
        </form>
      </div>

      {/* Price history */}
      {priceHistory.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 p-5 border-b border-gray-100">
            <History className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">Price History</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {priceHistory.map((record, idx) => (
              <div key={record.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatCurrency(record.price_per_liter)}/L
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(record.effective_from).toLocaleString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>
                {idx === 0 && <span className="badge badge-green">Current</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
