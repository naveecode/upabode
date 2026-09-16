import type { Metadata } from 'next'
import { DM_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'
import '@uploadthing/react/styles.css'

import { getCurrentUser } from './actions'
import prisma from '../lib/prisma'
import Link from 'next/link'
import MobileNav from '../components/MobileNav'
import SplashLoader from '../components/SplashLoader'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'Upabode - Planetary Communication Network',
  description: 'Connect across the cosmos with Upabode',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  let unreadCount = 0
  if (user) {
    try {
      unreadCount = await prisma.notification.count({
        where: { userId: user.id, read: false },
      })
    } catch {}
  }

  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${spaceGrotesk.variable} app-shell`}>
        <SplashLoader />
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark"></span>
            <span className="brand-name">Upabode</span>
          </Link>

          <div className="topbar-right flex items-center gap-3">
            {user ? (
              <>
                <Link href="/explore" className="icon-button" title="Explore & Search Media">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </Link>
                <Link href="/notifications" className="icon-button relative" title="Notifications">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--earth)',
                      boxShadow: '0 0 8px var(--earth)'
                    }} />
                  )}
                </Link>
                <Link href="/profile" className="avatar bg-[var(--panel-solid)] text-white w-9 h-9 rounded-full flex items-center justify-center font-bold border-2 border-[var(--earth)] hover:scale-105 transition-transform" title="Profile & Settings">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </Link>
              </>
            ) : (
              <Link href="/auth/login" className="bg-[var(--earth)] text-[#07111f] px-4 py-2 rounded-full font-bold text-sm hover:bg-[var(--earth-dark)] transition-colors">Sign in</Link>
            )}
          </div>
        </header>

        <div className="page-content" style={{ animation: 'fadeIn 0.3s ease-out', minHeight: 'calc(100vh - 76px)' }}>
          {children}
        </div>

        <MobileNav />
      </body>
    </html>
  )
}
