import type { Metadata, Viewport } from 'next'
import { Montserrat, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import '@uploadthing/react/styles.css'

import { getCurrentUser } from './actions'
import Link from 'next/link'
import MobileNav from '../components/MobileNav'
import SplashLoader from '../components/SplashLoader'
import HeaderActions from '../components/HeaderActions'
import AppHeader from '../components/AppHeader'
import OnboardingModal from '../components/OnboardingModal'
import GlobalCallManager from '../components/GlobalCallManager'

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
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Multigram - Premium Communication',
  description: 'Luxurious social connections with Multigram',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var s = localStorage.getItem('orbit_ui_scale');
                if (s === 'compact' || !s) {
                  document.documentElement.setAttribute('data-ui-scale', 'compact');
                }
              } catch(e){}
            `,
          }}
        />
      </head>
      <body className={`${montserrat.variable} ${cormorant.variable} app-shell`} data-user-id={user?.id || ''}>
        <SplashLoader />
        {user && <GlobalCallManager currentUser={user} />}
        {user ? (
          <>
            <AppHeader user={user} />

            <div className="page-content">
              {children}
            </div>

            <MobileNav />
            {!user.onboarded && <OnboardingModal currentUser={user} />}
          </>
        ) : (
          <div className="page-content auth-only-layout" style={{ minHeight: '100dvh', padding: 0 }}>
            {children}
          </div>
        )}
      </body>
    </html>
  )
}
