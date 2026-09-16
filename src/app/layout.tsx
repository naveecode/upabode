import type { Metadata } from 'next'
import { Montserrat, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import '@uploadthing/react/styles.css'

import { getCurrentUser } from './actions'
import Link from 'next/link'
import MobileNav from '../components/MobileNav'
import SplashLoader from '../components/SplashLoader'
import SwipeWrapper from '../components/SwipeWrapper'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-body',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-heading',
})

export const metadata: Metadata = {
  title: 'Upabode - Premium Communication',
  description: 'Luxurious social connections with Upabode',
}

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
      <body className={`${montserrat.variable} ${cormorant.variable} app-shell`}>
        <SplashLoader />
        <header className="topbar">
          <div className="topbar-right flex items-center gap-3 w-full justify-end">
            {user ? (
              <>
                <Link href="/auth/register" className="bg-[var(--earth)] text-[var(--panel-solid)] px-4 py-1.5 rounded-full font-bold text-sm hover:bg-[var(--earth-dark)] transition-colors">
                  + Signal
                </Link>
                <Link href="/chat" className="relative p-2 text-white hover:text-[var(--earth)] transition-colors">
                  <span className="text-xl">💬</span>
                  {user.notifications?.some((n: any) => !n.read) && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[var(--danger)] rounded-full animate-pulse" style={{
                      boxShadow: '0 0 10px var(--danger)'
                    }} />
                  )}
                </Link>
                <Link href="/profile" className="avatar bg-[var(--panel-solid)] text-[var(--text)] w-9 h-9 rounded-full flex items-center justify-center font-bold border-2 border-[var(--earth)] hover:scale-105 transition-transform" title="Profile & Settings">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </Link>
              </>
            ) : (
              <Link href="/auth/login" className="bg-[var(--earth)] text-[#07111f] px-4 py-2 rounded-full font-bold text-sm hover:bg-[var(--earth-dark)] transition-colors">Sign in</Link>
            )}
            <Link href="/" className="brand ml-4">
              <span className="brand-mark"></span>
              <span className="brand-name">Upabode</span>
            </Link>
          </div>
        </header>

        <SwipeWrapper>
          <div className="page-content">
            {children}
          </div>
        </SwipeWrapper>

        <MobileNav />
      </body>
    </html>
  )
}
