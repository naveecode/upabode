import re

content = ''''use client'

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
    { href: '/', label: 'Feed', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
    { href: '/explore', label: 'Explore', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> },
    { href: '/reels', label: 'Reels', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> },
    { href: '/chat', label: 'Signals', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> },
    { href: '/profile', label: 'Profile', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> },
  ]

  const activeIndex = tabs.findIndex(t => t.href === '/' ? pathname === '/' : pathname.startsWith(t.href))
  const safeIndex = activeIndex === -1 ? 0 : activeIndex

  const [touchX, setTouchX] = useState<number | null>(null)
  const navRef = useRef<HTMLElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => setTouchX(e.touches[0].clientX)
  
  const handleTouchMove = (e: React.TouchEvent) => {
    // We let the user drag the indicator across the tabs for a fluid feel
    const currentX = e.touches[0].clientX;
    const width = window.innerWidth;
    const tabWidth = width / tabs.length;
    let newIndex = Math.floor(currentX / tabWidth);
    newIndex = Math.max(0, Math.min(newIndex, tabs.length - 1));
    if (newIndex !== safeIndex) {
       router.push(tabs[newIndex].href);
    }
  }

  const handleTouchEnd = () => setTouchX(null)

  return (
    <>
      <style>{
        .mobile-tabs-wave {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 70px;
          background: var(--panel-solid);
          display: flex;
          justify-content: space-around;
          align-items: center;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          box-shadow: 0 -4px 30px rgba(0,0,0,0.5);
          z-index: 1000;
          padding-bottom: env(safe-area-inset-bottom, 10px);
        }
        @media (min-width: 769px) { .mobile-tabs-wave { display: none; } }
        
        .tab-indicator {
          position: absolute;
          top: -20px;
          width: 56px;
          height: 56px;
          background: var(--earth);
          border-radius: 50%;
          border: 6px solid var(--background);
          transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          z-index: 1;
        }
        
        /* The liquid wave SVG background behind the indicator */
        .tab-wave-bg {
          position: absolute;
          top: -24px;
          width: 120px;
          height: 24px;
          transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          z-index: 0;
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
          transition: color 0.2s;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        
        .tab-item.active {
          color: var(--panel-solid);
        }
        
        .tab-icon {
          transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          transform: translateY(12px);
        }
        .tab-item.active .tab-icon {
          transform: translateY(-24px);
          color: var(--panel-solid);
        }
        
        .tab-label {
          font-size: 0.7rem;
          font-weight: 600;
          opacity: 1;
          transform: translateY(12px);
          transition: all 0.4s;
        }
        .tab-item.active .tab-label {
          opacity: 0;
          transform: translateY(20px);
        }
      }</style>
      
      <nav 
        ref={navRef}
        className="mobile-tabs-wave"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg className="tab-wave-bg" viewBox="0 0 120 24" style={{ transform: \	ranslateX(calc(\vw / \ - 60px + (100vw / \ / 2)))\ }}>
          <path d="M0,24 C30,24 40,0 60,0 C80,0 90,24 120,24 Z" fill="var(--background)" />
        </svg>
        
        <div className="tab-indicator" style={{ transform: \	ranslateX(calc(\vw / \ - 28px + (100vw / \ / 2)))\ }} />

        {tabs.map((tab, idx) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={\	ab-item \\}
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
'''

with open('src/components/MobileNav.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
