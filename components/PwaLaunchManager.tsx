"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FileText, CheckCircle, Calendar, MapPin, X, ExternalLink, Leaf } from "lucide-react";

interface ParsedStop {
  name: string;
  address: string;
  liters: number;
}

export default function PwaLaunchManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [fileContent, setFileContent] = useState<ParsedStop[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [protocolUrl, setProtocolUrl] = useState<string>("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    // 1. Check for Launch Queue (File Handler API)
    const win = window as any;
    if ("launchQueue" in win) {
      win.launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams.files || launchParams.files.length === 0) return;

        try {
          const fileEntry = launchParams.files[0];
          setFileName(fileEntry.name);
          const file = await fileEntry.getFile();
          const text = await file.text();
          
          let stops: ParsedStop[] = [];

          if (fileEntry.name.endsWith(".json")) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
              stops = parsed.map((s: any) => ({
                name: s.name || s.business_name || "Unknown Business",
                address: s.address || "No address provided",
                liters: Number(s.liters) || 0,
              }));
            } else if (parsed.stops && Array.isArray(parsed.stops)) {
              stops = parsed.stops.map((s: any) => ({
                name: s.name || s.business_name || "Unknown Business",
                address: s.address || "No address provided",
                liters: Number(s.liters) || 0,
              }));
            }
          } else {
            // Handle CSV or raw text
            const lines = text.split("\n");
            stops = lines
              .map((line: string) => {
                const parts = line.split(",");
                if (parts.length >= 2) {
                  return {
                    name: parts[0].trim(),
                    address: parts[1].trim(),
                    liters: Number(parts[2]) || 50,
                  };
                }
                return null;
              })
              .filter(Boolean) as ParsedStop[];
          }

          if (stops.length > 0) {
            setFileContent(stops);
          } else {
            triggerToast("Unable to extract valid route stops from file.");
          }
        } catch (err) {
          console.error("Error handling file launch:", err);
          triggerToast("Error importing route file.");
        }
      });
    }
  }, []);

  useEffect(() => {
    // 2. Check for Custom Protocol parameters (?uri=web+mellod...)
    const uri = searchParams.get("uri");
    if (uri && uri.startsWith("web+mellod:")) {
      try {
        const decoded = decodeURIComponent(uri);
        setProtocolUrl(decoded);
        // Clear parameter from URL bar silently
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("uri");
        const newQuery = newParams.toString() ? `?${newParams.toString()}` : "";
        router.replace(`/picker${newQuery}`);
      } catch (e) {
        console.error("Error decoding protocol link", e);
      }
    }
  }, [searchParams, router]);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  }

  function handleImport() {
    triggerToast(`Successfully imported ${fileContent?.length} stops into your daily schedule!`);
    setFileContent(null);
  }

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up bg-gray-900 text-white rounded-xl px-4 py-3.5 shadow-lg flex items-center gap-3 border border-white/10">
          <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold flex-1 leading-tight">{toastMessage}</p>
          <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Custom Protocol deep-link Alert Modal */}
      {protocolUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up border border-gray-100 pb-safe-bottom">
            <div className="bg-green-700 p-5 text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <ExternalLink className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-wide uppercase text-green-200">Protocol Link Launched</h3>
                <h2 className="font-black text-lg">Mellod Deep-Link</h2>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-xs">
                <span className="text-gray-400 block font-medium uppercase tracking-wide mb-1">Decoded URI</span>
                <code className="text-green-800 break-all font-semibold font-mono">{protocolUrl}</code>
              </div>

              <div className="text-xs text-gray-500 leading-relaxed">
                You were redirected to Mellod via a protocol integration link. You can use protocol links to share routes, dispatch collection requests, or view specific FBO profiles.
              </div>

              <button
                onClick={() => setProtocolUrl("")}
                className="btn btn-primary btn-full text-xs font-bold py-3"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Association Import Preview Drawer */}
      {fileContent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up border border-gray-100 pb-safe-bottom max-h-[85vh] flex flex-col">
            <div className="bg-green-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[10px] tracking-wider uppercase text-green-200">Import Route File</h3>
                  <h2 className="font-black text-base truncate max-w-[200px]">{fileName}</h2>
                </div>
              </div>
              <button
                onClick={() => setFileContent(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div className="bg-green-50/50 border border-green-100 rounded-xl p-3 flex items-center gap-3">
                <Leaf className="w-5 h-5 text-green-700 flex-shrink-0" />
                <p className="text-xs text-green-800 font-medium">
                  We found <strong>{fileContent.length} collection stops</strong> in this file. Click Import to add them to your schedule.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                  Stops Preview
                </span>
                {fileContent.map((stop, idx) => (
                  <div key={idx} className="flex gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl items-start">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-gray-800 truncate">{stop.name}</h4>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{stop.address}</p>
                    </div>
                    <span className="text-xs font-extrabold text-green-700 bg-white border border-green-100 px-2 py-0.5 rounded-lg flex-shrink-0">
                      {stop.liters} L
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-2">
              <button
                onClick={() => setFileContent(null)}
                className="btn btn-ghost flex-1 text-xs py-3 border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="btn btn-primary flex-1 text-xs py-3"
              >
                Import Route
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
