"use client";

import { useState, useRef, useEffect } from "react";
import { toggleLike, toggleFollow } from "../app/actions";
import { showToast } from "./Toast";
import Link from "next/link";

export default function Post({ post, currentUserId }: { post: any; currentUserId?: string }) {
  const initialLiked = currentUserId && post.likes ? post.likes.some((l: any) => l.userId === currentUserId) : false;
  const initialFollowing = currentUserId && post.author?.followers ? post.author.followers.some((f: any) => f.followerId === currentUserId) : false;
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Carousel slide index
  const mediaList = post.mediaUrl ? post.mediaUrl.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const [currentSlide, setCurrentSlide] = useState(0);

  const zoneRef = useRef<HTMLDivElement>(null);

  const handleLike = async (fromSwipe = false) => {
    setIsLiked(!isLiked);
    setLikesCount((prev: number) => (isLiked ? prev - 1 : prev + 1));
    if (fromSwipe) showToast(!isLiked ? "Signal liked" : "Like removed");
    await toggleLike(post.id);
  };

  const handleFollow = async (fromSwipe = false) => {
    setIsFollowing(!isFollowing);
    if (fromSwipe)
      showToast(!isFollowing ? "Now tracking this signal (followed)" : "Unfollowed signal");
    await toggleFollow(post.authorId);
  };

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let dragging = false;

    const start = (clientX: number, clientY: number) => {
      startX = clientX;
      startY = clientY;
      currentX = clientX;
      dragging = true;
      zone.style.transition = "none";
    };

    const move = (clientX: number, clientY: number) => {
      if (!dragging) return;
      currentX = clientX;
      const deltaX = currentX - startX;
      const deltaY = clientY - startY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        zone.style.transform = `translateX(${deltaX * 0.12}px) rotate(${
          deltaX * 0.015
        }deg)`;
      }
    };

    const end = () => {
      if (!dragging) return;
      dragging = false;
      zone.style.transition = "transform 0.25s ease";
      zone.style.transform = "";

      const distance = currentX - startX;

      if (Math.abs(distance) < 75) return;

      setFeedback(distance > 0 ? "✓" : "♥");

      const fbElement = zone.querySelector(".gesture-feedback");
      if (fbElement) {
        fbElement.classList.remove("show");
        void (fbElement as HTMLElement).offsetWidth;
        fbElement.classList.add("show");
      }

      if (distance > 0) {
        handleFollow(true);
      } else {
        handleLike(true);
      }
    };

    const onTouchStart = (e: TouchEvent) =>
      start(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    const onTouchMove = (e: TouchEvent) =>
      move(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    const onTouchEnd = () => end();

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if ((e.target as HTMLElement).closest('.carousel-nav-btn')) return;
      zone.setPointerCapture(e.pointerId);
      start(e.clientX, e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      move(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      end();
    };

    zone.addEventListener("touchstart", onTouchStart, { passive: true });
    zone.addEventListener("touchmove", onTouchMove, { passive: true });
    zone.addEventListener("touchend", onTouchEnd, { passive: true });
    zone.addEventListener("pointerdown", onPointerDown);
    zone.addEventListener("pointermove", onPointerMove);
    zone.addEventListener("pointerup", onPointerUp);
    zone.addEventListener("pointercancel", end);

    return () => {
      zone.removeEventListener("touchstart", onTouchStart);
      zone.removeEventListener("touchmove", onTouchMove);
      zone.removeEventListener("touchend", onTouchEnd);
      zone.removeEventListener("pointerdown", onPointerDown);
      zone.removeEventListener("pointermove", onPointerMove);
      zone.removeEventListener("pointerup", onPointerUp);
      zone.removeEventListener("pointercancel", end);
    };
  }, [isLiked, isFollowing]);

  const getMediaClass = (mediaType?: string | null) => {
    switch (mediaType) {
      case 'aurora': return 'aurora';
      case 'mars-landscape': return 'mars-landscape';
      case 'ocean': return 'ocean';
      default: return 'aurora';
    }
  };

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSlide < mediaList.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const [showOptions, setShowOptions] = useState(false);
  
  const handleEdit = async () => {
    const newContent = prompt('Edit your transmission:', post.content);
    if (newContent !== null && newContent !== post.content) {
      // Need to import editPostContent from actions
      const { editPostContent } = await import('../app/actions');
      await editPostContent(post.id, newContent);
      window.location.reload();
    }
    setShowOptions(false);
  };

  const handleDelete = async () => {
    if (confirm('Permanently delete this transmission?')) {
      const { deletePost } = await import('../app/actions');
      await deletePost(post.id);
      window.location.reload();
    }
    setShowOptions(false);
  };

  const handleArchive = async () => {
    const { archivePost } = await import('../app/actions');
    await archivePost(post.id);
    window.location.reload();
    setShowOptions(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/reels?post=${post.id}`);
    showToast('Transmission link copied to clipboard!');
    setShowOptions(false);
  };

  const handleDownload = () => {
    if (!post.mediaUrl) return;
    const a = document.createElement('a');
    a.href = post.mediaUrl;
    a.download = `upabode-orbit-${post.id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowOptions(false);
  };

  return (
    <article className="post" data-post-id={post.id} style={{ opacity: post.archived ? 0.7 : 1 }}>
      <div className="post-header" style={{ position: 'relative' }}>
        <div className="user">
          <div className={`user-avatar ${post.author?.color || 'green'}`}>
            {post.author?.avatarUrl || post.author?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <span className="username">{post.author?.username || post.author?.handle}</span>
            <span className="location">@{post.author?.handle} {post.author?.location ? `• ${post.author.location}` : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {post.archived && (
            <span style={{ fontSize: '0.72rem', color: '#ffb347', background: 'rgba(255, 179, 71, 0.1)', padding: '3px 8px', borderRadius: '100px', fontWeight: 600 }}>
              Archived
            </span>
          )}
          <span style={{ fontSize: '0.72rem', color: 'var(--earth)', background: 'rgba(64, 201, 162, 0.1)', padding: '3px 8px', borderRadius: '100px', fontWeight: 600 }}>
            {post.channel || 'earth'}
          </span>
          
          {/* Post Options Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowOptions(!showOptions)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px' }}
            >
              ⋮
            </button>
            {showOptions && (
              <div style={{
                position: 'absolute', right: 0, top: '100%',
                background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px',
                padding: '8px', zIndex: 100, minWidth: '160px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                {currentUserId === post.authorId && (
                  <>
                    <button onClick={handleEdit} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', transition: '0.2s', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>✏️ Edit Content</button>
                    <button onClick={handleArchive} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', transition: '0.2s', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>📦 {post.archived ? 'Unarchive' : 'Archive'}</button>
                    <button onClick={handleDelete} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: '8px', transition: '0.2s', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,107,122,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>🗑️ Delete</button>
                  </>
                )}
                <button onClick={handleShare} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', transition: '0.2s', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>🔗 Copy Link</button>
                {post.mediaUrl && (
                  <button onClick={handleDownload} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', transition: '0.2s', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>⬇️ Download Media</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Swipe Zone / Media Area / Carousel */}
      <div
        ref={zoneRef}
        className={`post-media ${mediaList.length === 0 ? getMediaClass(post.mediaType) : ''} ${post.visualFilter || ''}`}
        data-swipe-zone
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {post.musicTrack && (
          <audio src={post.musicTrack} autoPlay loop muted={false} style={{ display: 'none' }} />
        )}
        
        {/* Render Carousel or Single Media Image */}
        {mediaList.length > 0 ? (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {mediaList[currentSlide].match(/\.(mp4|webm|ogg|mov)$/i) ? (
              <video
                src={mediaList[currentSlide]}
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none'
                }}
              />
            ) : (
              <img
                src={mediaList[currentSlide]}
                alt={`Transmission slide ${currentSlide + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  transition: 'opacity 0.2s ease'
                }}
              />
            )}

            {/* Carousel navigation arrows if multiple slides */}
            {mediaList.length > 1 && (
              <>
                {currentSlide > 0 && (
                  <button
                    onClick={prevSlide}
                    className="carousel-nav-btn"
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.65)',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      zIndex: 10
                    }}
                  >
                    ‹
                  </button>
                )}

                {currentSlide < mediaList.length - 1 && (
                  <button
                    onClick={nextSlide}
                    className="carousel-nav-btn"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.65)',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      zIndex: 10
                    }}
                  >
                    ›
                  </button>
                )}

                {/* Dot indicators */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '6px',
                  zIndex: 10
                }}>
                  {mediaList.map((_: any, idx: number) => (
                    <span
                      key={idx}
                      style={{
                        width: idx === currentSlide ? '18px' : '6px',
                        height: '6px',
                        borderRadius: '100px',
                        background: idx === currentSlide ? 'var(--earth)' : 'rgba(255,255,255,0.4)',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}

        <span className="media-label">
          Transmission #{post.id.substring(post.id.length - 4)}
        </span>
        <div className={`gesture-feedback ${feedback ? "show" : ""}`}>
          {feedback}
        </div>
      </div>

      <div className="post-actions">
        <button
          className={`action-button like-button ${isLiked ? "liked" : ""}`}
          onClick={() => handleLike(false)}
        >
          <span className="action-icon">{isLiked ? "♥" : "♡"}</span>
          <span>Like</span>
        </button>

        <button
          className={`action-button follow-button ${
            isFollowing ? "following" : ""
          }`}
          onClick={() => handleFollow(false)}
        >
          <span className="action-icon">{isFollowing ? "✓" : "＋"}</span>
          <span>{isFollowing ? "Following" : "Follow"}</span>
        </button>

        <Link href="/reels" className="action-button" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span>💬</span>
          <span>{post.reelComments?.length || 0} Notes</span>
        </Link>

        <Link href={`/chat`} className="action-button" style={{ marginLeft: "auto", textDecoration: 'none', color: 'inherit' }}>
          <span>↗ Signal</span>
        </Link>
      </div>

      <div className="post-content">
        <div className="post-likes">
          <span className="likes-count">{likesCount.toLocaleString()}</span>{" "}
          likes
        </div>
        <p className="caption">
          <strong>@{post.author?.handle}</strong> {post.content}
        </p>
        <Link href="/reels" style={{ display: 'inline-block', marginTop: '8px', color: 'var(--earth)', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 600 }}>
          Experience in Reels Mode ▶
        </Link>
      </div>
    </article>
  );
}
