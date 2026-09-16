'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SwipeWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  // Don't intercept swipes in carousels or chat
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

  const handleTouchStart = (e: any) => setTouchStart(e.targetTouches[0].clientX)
  const handleTouchMove = (e: any) => setTouchEnd(e.targetTouches[0].clientX)
  const handleTouchEnd = (e: any) => {
    // Prevent navigating if swiping over a carousel (which we identify if the target is inside something with overflow-x)
    const isCarousel = e.target.closest('.post-media-carousel, .story-tray')
    if (isCarousel || !touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 70
    const isRightSwipe = distance < -70

    if (isLeftSwipe || isRightSwipe) {
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
    setTouchStart(0)
    setTouchEnd(0)
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
