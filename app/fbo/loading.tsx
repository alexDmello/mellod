

export default function FBOLoading() {
  return (
    <div className="animate-fade-in space-y-4 pb-8 font-sans">
      {/* Skeleton Header matching FBOHeader shape */}
      <div
        className="bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-900 px-5 pb-12 text-white shadow-xl shadow-emerald-950/20 rounded-b-3xl relative overflow-hidden"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Branding Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-700/40 mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
              <img src="/icons/logo.png" alt="Mellod Logo" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <div className="text-white font-black text-sm tracking-tight leading-none">Mellod Biofuels</div>
              <div className="text-emerald-300 text-[11px] font-medium mt-0.5">FBO Partner Portal</div>
            </div>
          </div>
        </div>

        {/* Hero skeleton */}
        <div className="relative z-10 space-y-2">
          <div className="h-5 w-28 bg-white/10 rounded-full animate-pulse" />
          <div className="h-7 w-48 bg-white/15 rounded-lg animate-pulse" />
          <div className="h-4 w-40 bg-white/10 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Content skeleton cards */}
      <div className="px-4 -mt-6 relative z-10 space-y-4">
        {/* KPI cards row */}
        <div className="grid grid-cols-2 gap-3.5">
          {[1, 2].map((n) => (
            <div key={n} className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 space-y-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-7 w-20 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-3 w-28 bg-slate-100 rounded-md animate-pulse" />
            </div>
          ))}
        </div>

        {/* Market price card skeleton */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="h-3 w-36 bg-white/15 rounded-md animate-pulse" />
          <div className="h-9 w-24 bg-white/20 rounded-lg animate-pulse" />
          <div className="h-3 w-48 bg-white/10 rounded-md animate-pulse" />
        </div>

        {/* Pickups card skeleton */}
        <div className="bg-white rounded-2xl p-4.5 border border-gray-100 shadow-xl shadow-gray-200/80 flex items-center gap-4">
          <div className="w-11 h-11 bg-slate-100 rounded-xl animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Recent activity skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="h-4 w-40 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-5 w-20 bg-emerald-50 rounded-full animate-pulse" />
          </div>
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0">
              <div className="space-y-1.5">
                <div className="h-3 w-24 bg-slate-200 rounded-md animate-pulse" />
                <div className="h-2.5 w-16 bg-slate-100 rounded-md animate-pulse" />
              </div>
              <div className="text-right space-y-1.5">
                <div className="h-3 w-12 bg-slate-200 rounded-md animate-pulse" />
                <div className="h-3 w-14 bg-emerald-100 rounded-md animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
