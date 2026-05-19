import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/layout/QueryProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Lumina — B2B Financial Reconciliation AI',
  description: 'Autonomous B2B financial reconciliation agent powered by Google Gemini and MongoDB',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className="min-h-screen bg-surface-primary text-white antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
