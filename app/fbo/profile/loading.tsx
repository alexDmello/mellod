export default function FBOProfileLoading() {
  return (
    <div className="animate-fade-in space-y-5 pb-8 font-sans text-slate-900">
      {/* Header skeleton */}
      <div
        className="bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-900 px-5 pb-12 text-white shadow-xl shadow-emerald-950/20 rounded-b-3xl relative overflow-hidden"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 animate-pulse border border-white/20" />
          <div className="space-y-2">
            <div className="h-5 w-44 bg-white/20 rounded-lg animate-pulse" />
            <div className="h-3 w-36 bg-white/10 rounded-md animate-pulse" />
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-4">
        {/* Business details card skeleton */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="h-4 w-40 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-5 w-24 bg-emerald-100 rounded-full animate-pulse" />
          </div>

          <div className="space-y-3">
            <div className="h-3 w-28 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-5 w-36 bg-slate-200 rounded-md animate-pulse" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="h-10 bg-slate-50 rounded-xl animate-pulse" />
              <div className="h-10 bg-slate-50 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>

        {/* Payment methods card skeleton */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="space-y-1">
              <div className="h-4 w-36 bg-slate-200 rounded-md animate-pulse" />
              <div className="h-3 w-48 bg-slate-100 rounded-md animate-pulse" />
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 bg-slate-200 rounded-md animate-pulse" />
              <div className="h-3 w-44 bg-slate-100 rounded-md animate-pulse" />
            </div>
          </div>
        </div>

        {/* Support desk skeleton */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded-md animate-pulse" />
          <div className="h-12 bg-emerald-50 rounded-xl border border-emerald-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
