export default function PickerHistoryLoading() {
  return (
    <div className="animate-fade-in space-y-5 pb-8 font-sans text-slate-900">
      {/* Header Skeleton */}
      <div
        className="bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-900 px-5 pb-12 text-white shadow-xl shadow-emerald-950/20 rounded-b-3xl relative overflow-hidden"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="space-y-2">
          <div className="h-4 w-36 bg-white/15 rounded-full animate-pulse" />
          <div className="h-7 w-52 bg-white/20 rounded-lg animate-pulse" />
          <div className="h-3.5 w-44 bg-white/10 rounded-md animate-pulse" />

          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/20">
            <div className="bg-white/12 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 space-y-2">
              <div className="h-3 w-20 bg-white/15 rounded-md animate-pulse" />
              <div className="h-6 w-28 bg-white/20 rounded-lg animate-pulse" />
            </div>
            <div className="bg-white/12 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 space-y-2">
              <div className="h-3 w-24 bg-white/15 rounded-md animate-pulse" />
              <div className="h-6 w-20 bg-white/20 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-lg flex items-center justify-between gap-3"
          >
            <div className="w-11 h-11 bg-emerald-50 rounded-2xl animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded-md w-36 animate-pulse" />
              <div className="h-3 bg-slate-100 rounded-md w-28 animate-pulse" />
            </div>
            <div className="h-5 w-16 bg-slate-200 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
