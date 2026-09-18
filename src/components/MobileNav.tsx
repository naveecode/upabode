'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { haptic, playTabTick } from '../lib/soundAndHaptics'

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()

  // Hide mobile nav inside active 1:1 chatroom
  if (pathname.startsWith('/chat/') && pathname !== '/chat') {
    return null
  }

  const tabs = [
    { href: '/', label: 'Feed', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
    { href: '/explore', label: 'Explore', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> },
    { href: '/reels', label: 'Reels', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> },
    { href: '/chat', label: 'Signals', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> },
    { href: '/profile', label: 'Profile', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> },
  ]

  const activeIndex = tabs.findIndex(t => t.href === '/' ? pathname === '/' : pathname.startsWith(t.href))
  const safeIndex = activeIndex === -1 ? 0 : activeIndex

  const [visualIndex, setVisualIndex] = useState(safeIndex)
  const isReelsPage = pathname.startsWith('/reels')

  useEffect(() => {
    setVisualIndex(safeIndex)
  }, [safeIndex])

  // Pre-warm / prefetch all 5 tab routes on mount for instant zero-lag tab switching
  useEffect(() => {
    tabs.forEach(tab => {
      try {
        router.prefetch(tab.href)
      } catch (e) {}
    })
  }, [router])

  // Touch scrubbing / directional swipe handling over the bottom navigation bar
  const touchStartRef = useRef<{ x: number; y: number; startIndex: number; hasMoved: boolean } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      startIndex: visualIndex,
      hasMoved: false
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y

    // Directional swipe: Moving thumb towards the right moves selection right; moving thumb left moves selection left
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
      touchStartRef.current.hasMoved = true
      // Sensitivity: 32px per tab step in the swiping direction
      const step = Math.round(deltaX / 32)
      const targetIndex = Math.max(0, Math.min(tabs.length - 1, touchStartRef.current.startIndex + step))
      if (targetIndex !== visualIndex) {
        setVisualIndex(targetIndex)
        haptic(8)
        playTabTick()
        // Instantly transition main screen as finger scrubs through tabs
        router.push(tabs[targetIndex].href)
      }
    }
  }

  const handleTouchEnd = () => {
    touchStartRef.current = null
  }

  const handleTabClick = (idx: number) => {
    if (idx !== visualIndex) {
      setVisualIndex(idx)
      haptic(8)
      playTabTick()
    }
  }

  return (
    <>
      <style>{`
        .mobile-tabs-wave {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100vw;
          max-width: 100vw;
          height: 68px;
          background: ${isReelsPage ? 'rgba(7, 17, 31, 0.88)' : 'var(--panel-solid)'};
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          display: flex;
          align-items: center;
          border-top: 1px solid ${isReelsPage ? 'rgba(255, 255, 255, 0.12)' : 'rgba(28, 25, 20, 0.08)'};
          box-shadow: 0 -4px 25px rgba(0, 0, 0, 0.12);
          z-index: 1000;
          padding-bottom: env(safe-area-inset-bottom, 8px);
          overflow: hidden;
          box-sizing: border-box;
          touch-action: pan-x;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        @media (min-width: 769px) { .mobile-tabs-wave { display: none; } }
        
        /* The sliding cavity dock */
        .tab-cavity-slider {
          position: absolute;
          top: -1px;
          left: 0;
          width: ${100 / tabs.length}%;
          height: 24px;
          pointer-events: none;
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1;
        }

        .tab-cavity-svg {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 76px;
          height: 22px;
          overflow: visible;
        }
        
        .tab-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          position: relative;
          z-index: 2;
          color: ${isReelsPage ? 'rgba(255, 255, 255, 0.55)' : 'var(--muted)'};
          text-decoration: none;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        
        .tab-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease;
          transform: translateY(0);
          color: ${isReelsPage ? 'rgba(255, 255, 255, 0.55)' : 'var(--muted)'};
          opacity: 0.8;
        }

        .tab-item.active .tab-icon {
          transform: translateY(4px) scale(1.15);
          color: var(--earth);
          opacity: 1;
          filter: drop-shadow(0 2px 8px rgba(197, 160, 89, 0.45));
        }
        
        .tab-label {
          font-size: 0.68rem;
          font-weight: 500;
          margin-top: 3px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          color: ${isReelsPage ? 'rgba(255, 255, 255, 0.55)' : 'var(--muted)'};
          opacity: 0.8;
        }

        .tab-item.active .tab-label {
          color: var(--earth);
          font-weight: 700;
          transform: translateY(3px);
          opacity: 1;
        }
      `}</style>

      <nav 
        className="mobile-tabs-wave"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding Cavity (Wavy Dip) */}
        <div 
          className="tab-cavity-slider"
          style={{ transform: `translateX(${visualIndex * 100}%)` }}
        >
          <svg className="tab-cavity-svg" viewBox="0 0 76 22">
            <path 
              d="M 0 0 C 18 0, 20 20, 38 20 C 56 20, 58 0, 76 0 Z" 
              fill={isReelsPage ? '#07111f' : 'var(--background)'} 
              stroke={isReelsPage ? 'rgba(255, 255, 255, 0.12)' : 'rgba(28, 25, 20, 0.1)'} 
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {tabs.map((tab, idx) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tab-item ${idx === visualIndex ? 'active' : ''}`}
            onClick={() => handleTabClick(idx)}
            draggable={false}
          >
            <div className="tab-icon">{tab.icon}</div>
            <span className="tab-label">{tab.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
