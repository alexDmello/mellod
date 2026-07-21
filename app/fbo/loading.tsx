export default function FBOLoading() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Skeleton Hero */}
      <div className="bg-green-800/80 px-4 pt-6 pb-8 rounded-b-3xl h-28 flex flex-col justify-end space-y-2">
        <div className="w-24 h-3 bg-green-600/50 rounded" />
        <div className="w-48 h-6 bg-green-500/50 rounded" />
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Skeleton Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 h-28 bg-white border border-gray-100 space-y-2">
            <div className="w-9 h-9 bg-gray-200 rounded-xl" />
            <div className="w-20 h-6 bg-gray-200 rounded" />
            <div className="w-28 h-3 bg-gray-100 rounded" />
          </div>
          <div className="card p-4 h-28 bg-white border border-gray-100 space-y-2">
            <div className="w-9 h-9 bg-gray-200 rounded-xl" />
            <div className="w-20 h-6 bg-gray-200 rounded" />
            <div className="w-28 h-3 bg-gray-100 rounded" />
          </div>
        </div>

        {/* Skeleton Market Price Card */}
        <div className="bg-green-700/60 rounded-2xl p-5 h-28 flex items-center justify-between">
          <div className="space-y-2">
            <div className="w-24 h-3 bg-green-500/50 rounded" />
            <div className="w-32 h-7 bg-green-400/50 rounded" />
          </div>
          <div className="w-14 h-14 bg-white/15 rounded-2xl" />
        </div>

        {/* Skeleton Card */}
        <div className="card p-4 h-16 bg-white border border-gray-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="w-32 h-4 bg-gray-200 rounded" />
            <div className="w-20 h-3 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
