import type { Metadata } from 'next'
import { DM_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { getCurrentUser } from './actions'
import Link from 'next/link'
import MobileNav from '../components/MobileNav'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'Orbit - Interplanetary Communication',
  description: 'Connect across the cosmos',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${spaceGrotesk.variable} app-shell`}>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark"></span>
            <span className="brand-name">Orbit</span>
          </Link>

          <div className="topbar-right flex items-center gap-4">
            {user ? (
              <>
                <Link href="/explore" className="icon-button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </Link>
                <button className="icon-button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                </button>
                <div className="flex items-center gap-3">
                  <Link href="/profile" className="avatar bg-[var(--panel-solid)] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </Link>
                  <form action="/auth/login" method="GET">
                    <button type="submit" className="text-sm text-[var(--muted)] hover:text-white transition-colors">Account</button>
                  </form>
                </div>
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
