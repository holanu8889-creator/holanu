import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HOLANU - Marketplace Properti Digital',
  description: 'Platform jual, beli, dan sewa properti di Indonesia',
  openGraph: {
    title: 'HOLANU - Marketplace Properti Digital',
    description: 'Platform jual, beli, dan sewa properti di Indonesia',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  )
}