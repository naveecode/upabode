import type { Metadata, Viewport } from 'next'
import { Montserrat, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import '@uploadthing/react/styles.css'

import { getCurrentUser } from './actions'
import Link from 'next/link'
import MobileNav from '../components/MobileNav'
import SplashLoader from '../components/SplashLoader'
import HeaderActions from '../components/HeaderActions'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-body',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-heading',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Upabode - Premium Communication',
  description: 'Luxurious social connections with Upabode',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  manifest: '/manifest.json',
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user: any = null
  try {
    user = await getCurrentUser()
  } catch (err) {
    console.error('Failed to get user:', err)
  }

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.png" sizes="512x512" type="image/png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${montserrat.variable} ${cormorant.variable} app-shell`}>
        <SplashLoader />
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark"></span>
            <span className="brand-name">Upabode</span>
          </Link>
          <div className="topbar-right flex items-center gap-3">
            <HeaderActions user={user} />
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>

        <MobileNav />
      </body>
    </html>
  )
}
