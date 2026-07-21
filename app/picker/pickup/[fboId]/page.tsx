"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Camera, Droplets, Loader2, CheckCircle2,
  ArrowLeft, ImageIcon, X, AlertCircle
} from "lucide-react";
import imageCompression from "browser-image-compression";
import type { FBO } from "@/lib/types";

interface Props {
  params: Promise<{ fboId: string }>;
}

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
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-pulse-green">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Pickup Logged!</h2>
        <p className="text-gray-500 text-sm">
          {liters}L collected from {fbo?.business_name}
        </p>
        <p className="text-xs text-gray-400 mt-4">Returning to route...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <div>
          <h1 className="font-bold text-gray-900 text-base leading-none">Log Pickup</h1>
          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-52">{fbo?.business_name ?? "Loading..."}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* FBO info card */}
        {fbo && (
          <div className="card p-4 flex items-center gap-3 bg-green-50 border border-green-100">
            <div className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{fbo.business_name}</p>
              <p className="text-xs text-gray-500 truncate">{fbo.address ?? "No address"}</p>
            </div>
          </div>
        )}

        {/* Liters input */}
        <div className="card p-4">
          <label htmlFor="liters" className="form-label text-base mb-3">
            Liters Collected *
          </label>
          <div className="relative">
            <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 pointer-events-none" />
            <input
              id="liters"
              type="number"
              step="0.1"
              min="0.1"
              max="10000"
              inputMode="decimal"
              className="form-input !pl-10 !pr-8 text-xl font-bold"
              placeholder="0.0"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">L</span>
          </div>
        </div>

        {/* Camera photo capture */}
        <div className="card p-4">
          <label className="form-label text-base mb-3">Photo of Drums</label>

          {photoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Pickup photo preview"
                className="w-full h-48 object-cover rounded-xl"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {compressing ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Compressing...</>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    Photo ready
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-2 left-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-36 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all"
            >
              <Camera className="w-8 h-8" />
              <span className="text-sm font-medium">Tap to take photo</span>
              <span className="text-xs">Auto-compressed for fast upload</span>
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
              className="flex items-center gap-1.5 mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Or choose from gallery
            </button>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="form-label">Notes (optional)</label>
          <textarea
            id="notes"
            rows={2}
            className="form-input resize-none"
            placeholder="e.g. Drums were full, owner not present..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || compressing || !liters}
          className="btn btn-primary btn-full btn-lg"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> Confirm Pickup</>
          )}
        </button>
      </form>
    </div>
  );
}
