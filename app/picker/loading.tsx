

export default function PickerLoading() {
  return (
    <div className="animate-fade-in min-h-screen bg-gray-50/60 pb-12 font-sans">
      {/* Skeleton Header matching Picker header shape */}
      <div
        className="bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-900 px-5 pb-9 relative rounded-b-3xl shadow-xl shadow-emerald-950/20"
        style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }}
      >
        {/* Top branding bar */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-700/40 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
              <img src="/icons/logo.png" alt="Mellod Logo" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <div className="text-white font-black text-sm tracking-tight leading-none">Mellod Biofuels</div>
              <div className="text-emerald-300 text-[11px] font-medium mt-0.5">Field Agent App</div>
            </div>
          </div>
          <div className="w-20 h-7 bg-white/10 rounded-xl animate-pulse" />
        </div>

        {/* Welcome greeting skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-5 w-32 bg-white/10 rounded-full animate-pulse" />
            <div className="h-8 w-44 bg-white/15 rounded-lg animate-pulse" />
            <div className="h-3 w-28 bg-white/10 rounded-md animate-pulse" />
          </div>
          <div className="w-10 h-10 bg-white/15 rounded-2xl animate-pulse" />
        </div>

        {/* Progress HUD skeleton */}
        <div className="mt-5 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-inner space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="h-3 w-28 bg-white/15 rounded-md animate-pulse" />
            <div className="h-3 w-24 bg-white/20 rounded-md animate-pulse" />
          </div>
          <div className="h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div className="h-full bg-emerald-400/40 rounded-full w-1/3 animate-pulse" />
          </div>
          <div className="flex justify-between">
            <div className="h-2.5 w-20 bg-white/10 rounded-md animate-pulse" />
            <div className="h-2.5 w-28 bg-white/10 rounded-md animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content skeleton cards */}
      <div className="px-4 mt-5 space-y-4">
        {/* Tab switcher skeleton */}
        <div className="flex border border-gray-100 bg-white rounded-2xl p-1.5 shadow-xl shadow-gray-200/80 gap-1.5">
          <div className="flex-1 h-10 bg-emerald-700/80 rounded-xl animate-pulse" />
          <div className="flex-1 h-10 bg-gray-50 rounded-xl animate-pulse" />
        </div>

        {/* Route stop skeletons */}
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-slate-100 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 bg-slate-200 rounded-md w-40 animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded-md w-28 animate-pulse" />
                </div>
              </div>
              <div className="w-16 h-6 rounded-full bg-slate-100 animate-pulse" />
            </div>
            <div className="h-11 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
