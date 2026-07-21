"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Share2, MapPin, Save, ChevronLeft, CheckCircle, Info } from "lucide-react";
import Link from "next/link";

function ShareTargetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [leadName, setLeadName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Read parameters sent by Web Share Target
    const sharedTitle = searchParams.get("title") || "";
    const sharedText = searchParams.get("text") || "";
    const sharedUrl = searchParams.get("url") || "";

    setTitle(sharedTitle);
    setText(sharedText);
    setUrl(sharedUrl);

    // Populate user-editable fields with shared info
    setLeadName(sharedTitle || "New Collection Request");
    
    // Parse address or coordinates if they look like a Google Maps link or location description
    let derivedAddress = "";
    if (sharedText) derivedAddress += sharedText;
    if (sharedUrl) {
      if (derivedAddress) derivedAddress += "\n";
      derivedAddress += sharedUrl;
    }
    setAddress(derivedAddress || "Pending verification");
  }, [searchParams]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Save to local storage for picker leads
    const savedLeads = localStorage.getItem("mellod_shared_leads") || "[]";
    try {
      const leads = JSON.parse(savedLeads);
      const newLead = {
        id: `lead-${Date.now()}`,
        name: leadName,
        phone: contactPhone || "N/A",
        address,
        notes,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("mellod_shared_leads", JSON.stringify([newLead, ...leads]));
    } catch (err) {
      console.error("Error saving lead:", err);
    }

    setSaved(true);
    setTimeout(() => {
      router.push("/picker");
    }, 2000);
  }

  return (
    <div className="flex-1 p-4 space-y-4">
      {saved ? (
        <div className="card p-8 text-center bg-white border border-green-100 shadow-sm flex flex-col items-center justify-center space-y-3 py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-50 text-green-700 flex items-center justify-center mb-2">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Lead Saved Successfully!</h2>
          <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
            The collection lead has been logged on-device. Returning you to today's collection route...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card p-5 bg-white border border-gray-100 shadow-sm space-y-4">
          <div className="bg-green-50/50 border border-green-100 rounded-xl p-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-green-800 leading-relaxed font-medium">
              We parsed this info from your system share sheet. Modify the fields below to create a picker collection lead.
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="lead-name" className="form-label text-xs">Lead/Restaurant Name</label>
            <input
              id="lead-name"
              type="text"
              className="form-input text-xs"
              placeholder="e.g. Burger Palace"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="contact-phone" className="form-label text-xs">Contact Phone (Optional)</label>
            <input
              id="contact-phone"
              type="tel"
              className="form-input text-xs"
              placeholder="e.g. +91 98765 43210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="address" className="form-label text-xs">Address / Shared Link</label>
            <textarea
              id="address"
              className="form-input text-xs min-h-[80px]"
              placeholder="Restaurant address or location link"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className="form-label text-xs">Additional Notes</label>
            <textarea
              id="notes"
              className="form-input text-xs min-h-[60px]"
              placeholder="e.g. Contact says they have 80 liters of palm oil ready."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full text-xs font-bold py-3 flex items-center justify-center gap-2 mt-2"
          >
            <Save className="w-4 h-4" />
            Save Collection Lead
          </button>
        </form>
      )}

      {/* Shared Raw Metadata (for debugging) */}
      {!saved && (title || text || url) && (
        <div className="card p-4 bg-gray-50 border border-gray-100 text-[10px] space-y-2">
          <span className="text-gray-400 font-bold uppercase tracking-wider block">Raw Shared Data</span>
          {title && (
            <div>
              <span className="text-gray-500 font-semibold">Title:</span> {title}
            </div>
          )}
          {text && (
            <div>
              <span className="text-gray-500 font-semibold">Text:</span> {text}
            </div>
          )}
          {url && (
            <div className="truncate">
              <span className="text-gray-500 font-semibold">URL:</span>{" "}
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                {url}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-700 px-4 pb-3.5 sticky top-0 z-30 flex items-center gap-3" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}>
        <Link href="/picker" className="text-white hover:text-green-200 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-none">Share Target</h1>
            <p className="text-green-200 text-[10px] mt-0.5">Quick Lead Creator</p>
          </div>
        </div>
      </header>

      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
          Loading share target parameters...
        </div>
      }>
        <ShareTargetForm />
      </Suspense>
    </div>
  );
}
