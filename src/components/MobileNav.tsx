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

  const { push } = require('next/navigation');
  const [touchStart, setTouchStart] = require('react').useState(0);
  const [touchEnd, setTouchEnd] = require('react').useState(0);

  const handleTouchStart = (e: any) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: any) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.findIndex(t => t.href === '/' ? pathname === '/' : pathname.startsWith(t.href));
      if (currentIndex !== -1) {
        let nextIndex = currentIndex;
        if (isLeftSwipe && currentIndex < tabs.length - 1) nextIndex++;
        if (isRightSwipe && currentIndex > 0) nextIndex--;
        
        if (nextIndex !== currentIndex) {
          push(tabs[nextIndex].href);
        }
      }
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <nav 
      className="mobile-tabs"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
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
              transition: 'color 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease, transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease',
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
