export default function DashboardPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Agent Dashboard</h1>
      <p className="text-gray-500 mb-8">Live reconciliation status — Phase 4 implementation</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Companies Monitored', value: '—' },
          { label: 'Active Discrepancies', value: '—' },
          { label: 'Emails Awaiting Approval', value: '—' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-brand-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Agent Activity</h2>
        <p className="text-gray-400 text-sm">Agent activity log will appear here.</p>
      </div>
    </div>
  )
}
