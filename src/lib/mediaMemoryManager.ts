// Media Memory Manager: Decaches off-screen media, cleans up video buffers, and prevents mobile browser memory bloat

/**
 * Cleanly releases a video element from memory by detaching its source,
 * clearing srcObject (MediaStream), and triggering garbage collection.
 */
export function releaseVideoMemory(videoEl: HTMLVideoElement | null) {
  if (!videoEl) return;
  try {
    videoEl.pause();
    if (videoEl.srcObject) {
      const stream = videoEl.srcObject as MediaStream;
      stream.getTracks?.().forEach(t => t.stop());
      videoEl.srcObject = null;
    }
    if (videoEl.src) {
      if (videoEl.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoEl.src);
      }
      videoEl.removeAttribute('src');
      videoEl.load(); // Forces browser decoder and VRAM to release buffer
    }
  } catch (err) {
    console.warn('Error releasing video memory:', err);
  }
}

/**
 * Cleanly unloads an image element from memory
 */
export function releaseImageMemory(imgEl: HTMLImageElement | null) {
  if (!imgEl) return;
  try {
    if (imgEl.src && imgEl.src.startsWith('blob:')) {
      URL.revokeObjectURL(imgEl.src);
    }
    imgEl.removeAttribute('src');
  } catch (err) {
    console.warn('Error releasing image memory:', err);
  }
}

/**
 * LRU Media Cache Registry for active components
 */
class MediaRegistry {
  private activeVideos = new Set<HTMLVideoElement>();
  private maxConcurrent = 3;

  register(video: HTMLVideoElement) {
    this.activeVideos.add(video);
    if (this.activeVideos.size > this.maxConcurrent) {
      const first = this.activeVideos.values().next().value;
      if (first && first !== video) {
        releaseVideoMemory(first);
        this.activeVideos.delete(first);
      }
    }
  }

  unregister(video: HTMLVideoElement) {
    this.activeVideos.delete(video);
    releaseVideoMemory(video);
  }
}

export const mediaRegistry = new MediaRegistry();
