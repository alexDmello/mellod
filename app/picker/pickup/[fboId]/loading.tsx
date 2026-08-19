export default function PickerLogPickupLoading() {
  return (
    <div className="animate-fade-in space-y-5 pb-8 font-sans text-slate-900">
      <div
        className="bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-900 px-5 pb-12 text-white shadow-xl rounded-b-3xl relative overflow-hidden"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/15 rounded-full animate-pulse" />
          <div className="h-7 w-56 bg-white/20 rounded-lg animate-pulse" />
          <div className="h-3.5 w-44 bg-white/10 rounded-md animate-pulse" />
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-4">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-32 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-28 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 animate-pulse" />
          </div>
          <div className="h-12 bg-emerald-600 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
