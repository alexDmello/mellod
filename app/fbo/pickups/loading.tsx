export default function FBOPickupsLoading() {
  return (
    <div className="animate-fade-in space-y-4 pb-8 font-sans">
      {/* Skeleton Header */}
      <div
        className="bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-900 px-5 pb-12 text-white shadow-xl shadow-emerald-950/20 rounded-b-3xl relative overflow-hidden"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between pb-4 border-b border-emerald-700/40 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <img src="/icons/logo.png" alt="Mellod Logo" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <div className="text-white font-black text-sm">Mellod Biofuels</div>
              <div className="text-emerald-300 text-[11px] font-medium">FBO Partner Portal</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/15 rounded-full animate-pulse" />
          <div className="h-7 w-56 bg-white/20 rounded-lg animate-pulse" />
          <div className="h-3.5 w-44 bg-white/10 rounded-md animate-pulse" />
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-4">
        {/* Sub-tabs skeleton */}
        <div className="flex border-1.5 border-emerald-950 bg-white rounded-2xl p-1.5 shadow-[3px_3px_0px_#064e3b] gap-1.5">
          <div className="flex-1 h-10 bg-emerald-600 rounded-xl animate-pulse" />
          <div className="flex-1 h-10 bg-emerald-50 rounded-xl animate-pulse" />
        </div>

        {/* Pickup logs skeleton list */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="paper-card p-4.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 bg-emerald-100/70 rounded-md animate-pulse" />
                <div className="h-5 w-20 bg-emerald-200/80 rounded-full animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-2 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-950/20">
                <div className="space-y-1.5">
                  <div className="h-3 w-16 bg-emerald-100/60 rounded-md animate-pulse" />
                  <div className="h-6 w-24 bg-emerald-200/70 rounded-lg animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-20 bg-emerald-100/60 rounded-md animate-pulse" />
                  <div className="h-6 w-28 bg-emerald-200/70 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
