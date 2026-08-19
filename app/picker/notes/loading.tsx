export default function PickerNotesLoading() {
  return (
    <div className="animate-fade-in space-y-5 pb-8 font-sans text-slate-900">
      <div
        className="bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-900 px-5 pb-10 text-white shadow-xl rounded-b-3xl relative overflow-hidden"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/15 rounded-full animate-pulse" />
          <div className="h-7 w-48 bg-white/20 rounded-lg animate-pulse" />
          <div className="h-3.5 w-40 bg-white/10 rounded-md animate-pulse" />
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-36 bg-slate-200 rounded-md animate-pulse" />
              <div className="h-4 w-20 bg-slate-100 rounded-md animate-pulse" />
            </div>
            <div className="h-10 bg-slate-50 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
