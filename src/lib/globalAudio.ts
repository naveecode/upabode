'use client'

import { useState, useEffect } from 'react'
import { haptic, playToggleTick } from './soundAndHaptics'

const STORAGE_KEY = 'multigram_feed_muted'

// Default to muted true for smooth mobile & web autoplay compliance
let globalMutedState: boolean = true

// Initialize from localStorage if on client
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved !== null) {
    globalMutedState = saved === 'true'
  }
}

const listeners = new Set<(isMuted: boolean) => void>()

export function getFeedMuted(): boolean {
  return globalMutedState
}

export function setFeedMuted(muted: boolean): void {
  globalMutedState = muted
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, String(muted))
    } catch {}

    // Synchronize all video and audio elements on the page
    document.querySelectorAll('video, audio').forEach((media) => {
      const el = media as HTMLMediaElement
      el.muted = muted
    })

    // Notify listeners
    listeners.forEach((listener) => {
      try {
        listener(muted)
      } catch {}
    })

    window.dispatchEvent(
      new CustomEvent('multigram-audio-mute-change', {
        detail: { isMuted: muted }
      })
    )
  }
}

export function toggleFeedMuted(): boolean {
  const next = !globalMutedState
  haptic(10)
  playToggleTick()
  setFeedMuted(next)
  return next
}

export function subscribeFeedMuted(cb: (isMuted: boolean) => void): () => void {
  listeners.add(cb)
  cb(globalMutedState)
  return () => {
    listeners.delete(cb)
  }
}

/**
 * React hook to synchronize with global audio mute state
 */
export function useGlobalFeedMute() {
  const [isMuted, setIsMuted] = useState<boolean>(globalMutedState)

  useEffect(() => {
    return subscribeFeedMuted((muted) => {
      setIsMuted(muted)
    })
  }, [])

  return {
    isMuted,
    toggleMute: toggleFeedMuted,
    setMuted: setFeedMuted
  }
}
