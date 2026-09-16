'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()

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

  useEffect(() => {
    setVisualIndex(safeIndex)
  }, [safeIndex])

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX
    const width = window.innerWidth
    const tabWidth = width / tabs.length
    let newIndex = Math.floor(currentX / tabWidth)
    newIndex = Math.max(0, Math.min(newIndex, tabs.length - 1))
    setVisualIndex(newIndex)
  }

  const handleTouchEnd = () => {
    if (visualIndex !== safeIndex) {
      router.push(tabs[visualIndex].href)
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
          background: var(--panel-solid);
          display: flex;
          align-items: center;
          border-top: 1px solid rgba(28, 25, 20, 0.08);
          box-shadow: 0 -4px 25px rgba(0, 0, 0, 0.07);
          z-index: 1000;
          padding-bottom: env(safe-area-inset-bottom, 8px);
          overflow: hidden;
          box-sizing: border-box;
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
          transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
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
          transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), color 0.3s ease;
          transform: translateY(0);
          color: var(--muted);
          opacity: 0.75;
        }

        .tab-item.active .tab-icon {
          transform: translateY(4px) scale(1.15);
          color: var(--earth);
          opacity: 1;
          filter: drop-shadow(0 2px 8px rgba(197, 160, 89, 0.4));
        }
        
        .tab-label {
          font-size: 0.68rem;
          font-weight: 500;
          margin-top: 3px;
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          color: var(--muted);
          opacity: 0.75;
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
              fill="var(--background)" 
              stroke="rgba(28, 25, 20, 0.1)" 
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {tabs.map((tab, idx) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tab-item ${idx === visualIndex ? 'active' : ''}`}
            onClick={() => setVisualIndex(idx)}
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
