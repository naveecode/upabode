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
  // isShrunkToMenu determines if the bottom panel has morphed into the floating menu pill
  const [isShrunkToMenu, setIsShrunkToMenu] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const autoCollapseTimer = useRef<NodeJS.Timeout | null>(null)

  // Listen for data-drawer-open on body to immediately hide floating menu
  useEffect(() => {
    const checkDrawer = () => {
      setIsDrawerOpen(document.body.getAttribute('data-drawer-open') === 'true')
    }
    checkDrawer()
    const observer = new MutationObserver(checkDrawer)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-drawer-open'] })
    return () => observer.disconnect()
  }, [])

  // Sync active index & manage 3-second delay on reels before whirlpool menu morph
  useEffect(() => {
    setVisualIndex(safeIndex)
    if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current)

    if (isReelsPage) {
      // Keep bottom navigation visible for 3 seconds after entering Reels
      setIsShrunkToMenu(false)
      autoCollapseTimer.current = setTimeout(() => {
        setIsShrunkToMenu(true)
      }, 3000)
    } else {
      setIsShrunkToMenu(false)
    }

    return () => {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current)
    }
  }, [safeIndex, isReelsPage])

  // Pre-warm / prefetch all 5 tab routes on mount for instant zero-lag tab switching
  useEffect(() => {
    tabs.forEach(tab => {
      try {
        router.prefetch(tab.href)
      } catch (e) {}
    })
  }, [router])

  // Open menu and reveal full bottom bar
  const triggerReelsMenu = () => {
    setIsShrunkToMenu(false)
    haptic(10)
    playTabTick()
    if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current)
    // Keep open for 4.5 seconds then whirlpool back to menu pill
    autoCollapseTimer.current = setTimeout(() => {
      setIsShrunkToMenu(true)
    }, 4500)
  }

  // Touch scrubbing / directional swipe handling: strictly 1-step per swipe
  const touchStartRef = useRef<{ x: number; y: number; startIndex: number; hasStepped: boolean } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current)
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      startIndex: visualIndex,
      hasStepped: false
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y

    // Directional swipe: one step per swipe gesture (threshold 26px)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 26) {
      if (!touchStartRef.current.hasStepped) {
        touchStartRef.current.hasStepped = true
        const step = deltaX > 0 ? 1 : -1
        const targetIndex = Math.max(0, Math.min(tabs.length - 1, touchStartRef.current.startIndex + step))
        if (targetIndex !== visualIndex) {
          setVisualIndex(targetIndex)
          haptic(10)
          playTabTick()
          router.push(tabs[targetIndex].href)
        }
      }
    }
  }

  const handleTouchEnd = () => {
    touchStartRef.current = null
    // If on reels, restart 3s timer before whirlpool collapsing to menu
    if (isReelsPage) {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current)
      autoCollapseTimer.current = setTimeout(() => {
        setIsShrunkToMenu(true)
      }, 3000)
    }
  }

  const handleTabClick = (idx: number) => {
    if (idx !== visualIndex) {
      setVisualIndex(idx)
      haptic(10)
      playTabTick()
    }
    if (isReelsPage) {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current)
      autoCollapseTimer.current = setTimeout(() => setIsShrunkToMenu(true), 3000)
    }
  }

  return (
    <>
      <style>{`
        /* Adaptable, non-deforming bottom bar for all screen sizes and gesture insets */
        .mobile-tabs-wave {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: min(540px, 100vw);
          min-height: 64px;
          height: auto;
          background: var(--panel-solid);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          display: flex;
          align-items: center;
          border-top: 1px solid var(--line);
          box-shadow: 0 -4px 25px rgba(0, 0, 0, 0.18);
          z-index: 1000;
          padding-top: 6px;
          padding-bottom: max(10px, env(safe-area-inset-bottom, 10px));
          overflow: hidden;
          box-sizing: border-box;
          touch-action: pan-x;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease, filter 0.35s ease;
        }
        @media (min-width: 769px) { .mobile-tabs-wave { display: none; } }

        /* Gentle Magic Whirlpool Animations */
        @keyframes whirlpoolWrap {
          0% {
            opacity: 1;
            transform: translateX(-50%) scale(1) rotate(0deg);
            filter: blur(0px);
          }
          50% {
            opacity: 0.5;
            transform: translateX(-50%) scale(0.65) rotate(120deg);
            filter: blur(3px);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) scale(0.15) rotate(260deg);
            filter: blur(8px);
            pointer-events: none;
          }
        }

        @keyframes whirlpoolUnwrap {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.2) rotate(-180deg);
            filter: blur(8px);
          }
          65% {
            opacity: 0.85;
            transform: translateX(-50%) scale(1.04) rotate(12deg);
            filter: blur(1px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1) rotate(0deg);
            filter: blur(0px);
          }
        }

        @keyframes whirlpoolPillSpawn {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.2) rotate(180deg);
            filter: blur(6px);
          }
          70% {
            opacity: 1;
            transform: translateX(-50%) scale(1.08) rotate(-8deg);
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1) rotate(0deg);
          }
        }

        .mobile-tabs-wave.whirlpool-active {
          animation: whirlpoolWrap 0.55s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .mobile-tabs-wave.whirlpool-opening {
          animation: whirlpoolUnwrap 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
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
          min-height: 48px;
          position: relative;
          z-index: 2;
          color: var(--muted);
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
          color: var(--muted);
          opacity: 0.85;
        }

        .tab-item.active .tab-icon {
          transform: translateY(2px) scale(1.15);
          color: var(--earth);
          opacity: 1;
          filter: drop-shadow(0 2px 8px rgba(197, 160, 89, 0.45));
        }
        
        .tab-label {
          font-size: 0.68rem;
          font-weight: 500;
          margin-top: 2px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--muted);
          opacity: 0.85;
        }

        .tab-item.active .tab-label {
          color: var(--earth);
          font-weight: 700;
          transform: translateY(1px);
          opacity: 1;
        }

        body[data-drawer-open="true"] .reels-menu-pill,
        body[data-drawer-open="true"] .mobile-tabs-wave {
          display: none !important;
          pointer-events: none !important;
        }
      `}</style>

      {/* In Reels Mode: Sleek Floating Transparent Menu Pill with Whirlpool Appearance */}
      {isReelsPage && isShrunkToMenu && !isDrawerOpen && (
        <button
          type="button"
          onClick={triggerReelsMenu}
          aria-label="Open Navigation Bar"
          className="reels-menu-pill"
          style={{
            position: 'fixed',
            bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            background: 'rgba(7, 17, 31, 0.4)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '100px',
            padding: '7px 18px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '0.74rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            zIndex: 1001,
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            animation: 'whirlpoolPillSpawn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span>Menu</span>
        </button>
      )}

      {/* Navigation Bar (Full bar on all pages; swirls down in reels when collapsed) */}
      <nav 
        className={`mobile-tabs-wave ${isReelsPage && isShrunkToMenu ? 'whirlpool-active' : (isReelsPage ? 'whirlpool-opening' : '')}`}
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
