"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Camera, Droplets, Loader2, CheckCircle2,
  ArrowLeft, ImageIcon, X, AlertCircle, Building2
} from "lucide-react";
import imageCompression from "browser-image-compression";
import type { FBO } from "@/lib/types";

interface Props {
  params: Promise<{ fboId: string }>;
}

import PickerHeader from "@/components/PickerHeader";

export default function PickupPage({ params }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeId = searchParams.get("routeId");

  const [fboId, setFboId] = useState<string>("");
  const [fbo, setFBO] = useState<FBO | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [liters, setLiters] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Resolve params (async in Next 15+)
  useEffect(() => {
    params.then((p) => {
      setFboId(p.fboId);
    });
  }, [params]);

  useEffect(() => {
    if (fboId) fetchData();
  }, [fboId]);

  async function fetchData() {
    const [fboRes, priceRes] = await Promise.all([
      supabase.from("fbos").select("*").eq("id", fboId).single(),
      supabase.from("daily_prices").select("price_per_liter").order("effective_from", { ascending: false }).limit(1).single(),
    ]);
    setFBO(fboRes.data ?? null);
    setCurrentPrice(Number(priceRes.data?.price_per_liter ?? 0));
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.2,       // 200KB max
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      setPhoto(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
    setCompressing(false);
  }

  function clearPhoto() {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const litersNum = parseFloat(liters);
    if (!litersNum || litersNum <= 0) {
      setError("Please enter a valid amount of liters.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSubmitting(false); return; }

    const { data: picker } = await supabase
      .from("pickers")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!picker) { setError("Picker account not found."); setSubmitting(false); return; }

    // Submit via backend API route (bypasses Storage RLS & sets status to pending for Admin review)
    const formData = new FormData();
    formData.append("picker_id", picker.id);
    formData.append("fbo_id", fboId);
    if (routeId) formData.append("route_id", routeId);
    formData.append("liters", litersNum.toString());
    formData.append("price_per_liter", currentPrice.toString());
    if (notes.trim()) formData.append("notes", notes.trim());
    if (photo) formData.append("photo", photo);

    try {
      const res = await fetch("/api/pickup/log", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to log pickup.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/picker"), 2500);
    } catch (err: any) {
      setError(err.message || "Network error submitting pickup.");
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-slide-up">
        <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mb-4 border border-emerald-200 shadow-xl shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10 text-emerald-700" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-1">Pickup Logged Successfully!</h2>
        <p className="text-gray-600 text-xs font-semibold">
          {liters} Liters collected from {fbo?.business_name}
        </p>
        <p className="text-xs text-gray-400 mt-4 font-medium animate-pulse">Returning to route dashboard...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4 pb-8 font-sans">
      {/* Modern Emerald Unified Sub-Header */}
      <PickerHeader subtitle="Log Collection Stop" showBack={true}>
        <div>
          <h1 className="font-black text-white text-lg leading-none tracking-tight">Log UCO Collection</h1>
          <p className="text-emerald-300 text-xs mt-1 truncate max-w-64 font-medium">{fbo?.business_name ?? "Loading partner..."}</p>
        </div>
      </PickerHeader>

      <form onSubmit={handleSubmit} className="px-4 space-y-4">
        {/* FBO Info Card */}
        {fbo && (
          <div className="bg-white rounded-2xl p-4 flex items-center gap-3.5 border border-gray-100 shadow-xl shadow-gray-200/80">
            <div className="w-11 h-11 bg-teal-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-teal-100">
              <Building2 className="w-5 h-5 text-teal-700" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-gray-900 text-sm truncate">{fbo.business_name}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">{fbo.address ?? "No address listed"}</p>
            </div>
          </div>
        )}

        {/* Liters Input */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xl shadow-gray-200/80 space-y-2">
          <label htmlFor="liters" className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
            Liters Collected *
          </label>
          <div className="relative">
            <Droplets className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-600 pointer-events-none" />
            <input
              id="liters"
              type="number"
              step="0.1"
              min="0.1"
              max="10000"
              inputMode="decimal"
              className="w-full pl-12 pr-10 py-3 text-2xl font-black bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900"
              placeholder="0.0"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-sm">L</span>
          </div>
        </div>

        {/* Camera Photo Capture */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xl shadow-gray-200/80 space-y-3">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
            Photo Verification of Drums
          </label>

          {photoPreview ? (
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Pickup photo preview"
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/70 backdrop-blur-md text-white text-[11px] px-3 py-1 rounded-full font-bold">
                {compressing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Compressing...</>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                    Photo Compressed & Ready
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-2.5 left-2.5 w-8 h-8 bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/90 transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all bg-gray-50/40"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-800">Tap to Take Canister Photo</span>
              <span className="text-[10px] text-gray-400 font-medium">Auto-compressed for instant upload</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
            aria-label="Camera capture"
          />

          {!photoPreview && (
            <button
              type="button"
              onClick={() => { if (fileInputRef.current) { fileInputRef.current.removeAttribute("capture"); fileInputRef.current.click(); } }}
              className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 hover:text-emerald-700 font-bold transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-gray-400" />
              Select from device gallery
            </button>
          )}
        </div>

        {/* Notes Input */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xl shadow-gray-200/80 space-y-2">
          <label htmlFor="notes" className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
            Pickup Notes (Optional)
          </label>
          <textarea
            id="notes"
            rows={2}
            className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium resize-none text-gray-800"
            placeholder="e.g. Canisters full, restaurant owner signed verification slip..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5 font-bold shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || compressing || !liters}
          className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-700/25 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Submitting Collection...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> Confirm & Log Pickup</>
          )}
        </button>
      </form>
    </div>
  );
}
