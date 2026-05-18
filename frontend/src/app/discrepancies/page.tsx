export default function DiscrepanciesPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Discrepancies & Action Center</h1>
          <p className="text-gray-500">AI-detected financial mismatches and approval workflow</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-100 px-6 py-4">
          <p className="text-sm font-medium text-gray-700">All Discrepancies</p>
        </div>
        <div className="p-6">
          <p className="text-gray-400 text-sm">
            Discrepancy list with AI analysis and &quot;Approve &amp; Send&quot; buttons — Phase 4 implementation.
          </p>
        </div>
      </div>
    </div>
  )
}
