'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

export default function SwipeWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const touchEndRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Don't intercept swipes in individual chatrooms or full reels view
  if (pathname.startsWith('/chat/') || pathname.startsWith('/reels')) {
    return <>{children}</>
  }

  const tabs = [
    { href: '/' },
    { href: '/explore' },
    { href: '/reels' },
    { href: '/chat' },
    { href: '/profile' }
  ]

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length !== 1) return
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    touchEndRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length !== 1) return
    touchEndRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null
    // Avoid swiping inside horizontal scrolls, sliders, text inputs or video controls
    if (
      target?.closest?.('.post-media-carousel, .story-tray, input, textarea, button, select, [data-prevent-swipe="true"]')
    ) {
      return
    }

    const deltaX = touchEndRef.current.x - touchStartRef.current.x
    const deltaY = touchEndRef.current.y - touchStartRef.current.y

    // If gesture was predominantly vertical, prioritize vertical scroll and ignore horizontal swipe
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.75) {
      return
    }

    // Must exceed horizontal swipe threshold (60px)
    if (Math.abs(deltaX) < 60) return

    const isLeftSwipe = deltaX < -60  // Swipe Left -> next tab
    const isRightSwipe = deltaX > 60 // Swipe Right -> prev tab

    const currentIndex = tabs.findIndex(t => t.href === '/' ? pathname === '/' : pathname.startsWith(t.href))
    if (currentIndex !== -1) {
      let nextIndex = currentIndex
      if (isLeftSwipe && currentIndex < tabs.length - 1) nextIndex++
      if (isRightSwipe && currentIndex > 0) nextIndex--

      if (nextIndex !== currentIndex) {
        router.push(tabs[nextIndex].href)
      }
    }
  }

  return (
    <div 
      onTouchStart={handleTouchStart} 
      onTouchMove={handleTouchMove} 
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '100vh', width: '100%', touchAction: 'pan-y' }}
    >
      {children}
    </div>
  )
}

