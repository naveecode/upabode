'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MobileNav() {
  const pathname = usePathname()

  // Hide bottom dock when inside an active conversation on mobile so the input bar anchors cleanly to the bottom
  if (pathname.startsWith('/chat/') && pathname !== '/chat') {
    return null
  }

  const tabs = [
    { href: '/', label: 'Feed', icon: '⌂' },
    { href: '/explore', label: 'Explore', icon: '⌕' },
    { href: '/reels', label: 'Reels', icon: '▶' },
    { href: '/chat', label: 'Signals', icon: '💬' },
    { href: '/profile', label: 'Profile', icon: '◉' },
  ]

  return (
    <nav className="mobile-tabs">
      {tabs.map((tab) => {
        const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mobile-tab ${isActive ? 'active' : ''}`}
            style={{
              textDecoration: 'none',
              color: isActive ? 'var(--earth)' : 'var(--muted)',
              transition: 'color 0.2s ease, transform 0.15s ease',
              transform: isActive ? 'scale(1.08)' : 'scale(1)'
            }}
          >
            <span style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{tab.icon}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
