import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/components/layout/QueryProvider'

export const metadata: Metadata = {
  title: 'Lumina — B2B Financial Reconciliation AI',
  description: 'Autonomous B2B financial reconciliation agent powered by Google Gemini and MongoDB',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
