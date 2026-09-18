// Media Cache & Preload Manager for Orbit / Multigram Reels
// Caches thumbnails and media blobs locally in IndexedDB and Cache API to enable instant, zero-delay playback

const DB_NAME = 'multigram_media_cache'
const DB_VERSION = 1
const STORE_THUMBNAILS = 'thumbnails'
const STORE_BLOBS = 'media_blobs'
const CACHE_NAME = 'orbit-media-cache-v1'

// Memory cache for instantaneous access during active session
const memoryThumbCache = new Map<string, string>()
const memoryBlobUrlCache = new Map<string, string>()

let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window undefined'))
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_THUMBNAILS)) {
          db.createObjectStore(STORE_THUMBNAILS, { keyPath: 'url' })
        }
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          db.createObjectStore(STORE_BLOBS, { keyPath: 'url' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
  return dbPromise
}

/**
 * Get cached thumbnail dataURL (if available) from memory or IndexedDB
 */
export async function getCachedThumbnail(url: string): Promise<string | null> {
  if (!url) return null
  if (memoryThumbCache.has(url)) {
    return memoryThumbCache.get(url)!
  }

  try {
    const db = await getDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_THUMBNAILS, 'readonly')
      const store = tx.objectStore(STORE_THUMBNAILS)
      const req = store.get(url)
      req.onsuccess = () => {
        if (req.result?.dataUrl) {
          memoryThumbCache.set(url, req.result.dataUrl)
          resolve(req.result.dataUrl)
        } else {
          resolve(null)
        }
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/**
 * Save thumbnail dataURL to IndexedDB and memory
 */
export async function setCachedThumbnail(url: string, dataUrl: string): Promise<void> {
  if (!url || !dataUrl) return
  memoryThumbCache.set(url, dataUrl)
  try {
    const db = await getDB()
    const tx = db.transaction(STORE_THUMBNAILS, 'readwrite')
    const store = tx.objectStore(STORE_THUMBNAILS)
    store.put({ url, dataUrl, timestamp: Date.now() })
  } catch (e) {
    console.warn('Failed to store thumbnail in IDB:', e)
  }
}

/**
 * Extract a high-res video frame at a given second using offscreen video & canvas
 */
export function extractVideoFrame(videoUrl: string, atSeconds = 2.0): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null)

    // Check cache first
    if (memoryThumbCache.has(videoUrl)) {
      return resolve(memoryThumbCache.get(videoUrl)!)
    }

    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    let timeout: NodeJS.Timeout

    const cleanup = () => {
      clearTimeout(timeout)
      video.removeAttribute('src')
      video.load()
    }

    // Abort after 8 seconds if video cannot be loaded
    timeout = setTimeout(() => {
      cleanup()
      resolve(null)
    }, 8000)

    video.onloadedmetadata = () => {
      // Seek to target frame or 1s if video is shorter
      const seekTime = Math.min(atSeconds, Math.max(0.5, (video.duration || 3) / 2))
      video.currentTime = seekTime
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        const width = video.videoWidth || 480
        const height = video.videoHeight || 854
        canvas.width = Math.min(width, 720)
        canvas.height = Math.round((canvas.width / width) * height)

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          setCachedThumbnail(videoUrl, dataUrl)
          cleanup()
          return resolve(dataUrl)
        }
      } catch (err) {
        console.warn('Canvas frame extraction failed:', err)
      }
      cleanup()
      resolve(null)
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }

    // Set source
    video.src = videoUrl
  })
}

/**
 * Check if media blob is cached and return an instant object URL
 */
export async function getCachedMediaUrl(url: string): Promise<string> {
  if (!url) return url
  if (memoryBlobUrlCache.has(url)) {
    return memoryBlobUrlCache.get(url)!
  }

  try {
    // Check Cache API first
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME)
      const match = await cache.match(url)
      if (match) {
        const blob = await match.blob()
        const blobUrl = URL.createObjectURL(blob)
        memoryBlobUrlCache.set(url, blobUrl)
        return blobUrl
      }
    }

    // Check IndexedDB
    const db = await getDB()
    const blob: Blob | null = await new Promise((resolve) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly')
      const store = tx.objectStore(STORE_BLOBS)
      const req = store.get(url)
      req.onsuccess = () => resolve(req.result?.blob || null)
      req.onerror = () => resolve(null)
    })

    if (blob) {
      const blobUrl = URL.createObjectURL(blob)
      memoryBlobUrlCache.set(url, blobUrl)
      return blobUrl
    }
  } catch {
    // Fall back to original URL
  }

  return url
}

/**
 * Preload and locally cache video and thumbnails for the first few reels
 */
export async function preloadReelsAndThumbnails(
  reels: Array<{ mediaUrl?: string | null; mediaUrls?: string[] | null }>
): Promise<void> {
  if (typeof window === 'undefined' || !reels?.length) return

  // Limit preloading to the first 4 reels to save bandwidth while guaranteeing instant playback
  const topReels = reels.slice(0, 4)

  for (const reel of topReels) {
    const rawUrl = reel.mediaUrl || reel.mediaUrls?.[0]
    if (!rawUrl) continue

    const cleanUrl = rawUrl.split('#')[0]

    // 1. Preload & extract thumbnail frame in background
    getCachedThumbnail(cleanUrl).then((cached) => {
      if (!cached) {
        extractVideoFrame(cleanUrl, 2.0).catch(() => {})
      }
    })

    // 2. Fetch video into Cache API / IndexedDB in background
    try {
      if ('caches' in window) {
        const cache = await caches.open(CACHE_NAME)
        const match = await cache.match(cleanUrl)
        if (!match) {
          fetch(cleanUrl, { mode: 'cors' })
            .then(async (res) => {
              if (res.ok) {
                const cloned = res.clone()
                await cache.put(cleanUrl, res)
                const blob = await cloned.blob()
                const db = await getDB()
                const tx = db.transaction(STORE_BLOBS, 'readwrite')
                tx.objectStore(STORE_BLOBS).put({
                  url: cleanUrl,
                  blob,
                  size: blob.size,
                  timestamp: Date.now()
                })
              }
            })
            .catch(() => {})
        }
      }
    } catch {
      // Ignore background caching errors
    }
  }
}
