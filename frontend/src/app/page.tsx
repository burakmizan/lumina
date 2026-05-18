import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl">
        <h1 className="text-6xl font-bold text-brand-900 mb-4 tracking-tight">Lumina</h1>
        <p className="text-xl text-gray-500 mb-2">Autonomous B2B Financial Reconciliation AI Agent</p>
        <p className="text-sm text-gray-400 mb-10">Powered by Google Gemini · MongoDB · MCP</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Open Dashboard
          </Link>
          <Link
            href="/discrepancies"
            className="border border-brand-500 text-brand-600 hover:bg-brand-50 font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            View Discrepancies
          </Link>
        </div>
      </div>
    </main>
  )
}
