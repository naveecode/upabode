'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { searchContent, toggleLike, toggleFollow } from '../app/actions'

interface ExploreProps {
  initialUsers: any[]
  initialPosts: any[]
  currentUserId?: string
}

export default function ExploreSearch({
  initialUsers,
  initialPosts,
  currentUserId,
}: ExploreProps) {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'media' | 'people'>('all')
  const [isSearching, setIsSearching] = useState(false)
  const [searchedUsers, setSearchedUsers] = useState<any[]>([])
  const [searchedPosts, setSearchedPosts] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  // Selected post for Instagram-style modal viewer
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [selectedPostLiked, setSelectedPostLiked] = useState(false)
  const [selectedPostLikesCount, setSelectedPostLikesCount] = useState(0)

  // Real-time search debounced 300ms
  useEffect(() => {
    if (!query.trim()) {
      setHasSearched(false)
      setSearchedUsers([])
      setSearchedPosts([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await searchContent(query)
        if (res?.success) {
          setSearchedUsers(res.users || [])
          setSearchedPosts(res.posts || [])
          setHasSearched(true)
        }
      } catch (e) {
        console.error('Search failed:', e)
      } finally {
        setIsSearching(false)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [query])

  const openPostModal = (post: any) => {
    setSelectedPost(post)
    const isLiked = currentUserId && post.likes ? post.likes.some((l: any) => l.userId === currentUserId) : false
    setSelectedPostLiked(isLiked)
    setSelectedPostLikesCount(post.likes?.length || 0)
  }

  const handleModalLike = async () => {
    if (!selectedPost) return
    const nextLiked = !selectedPostLiked
    setSelectedPostLiked(nextLiked)
    setSelectedPostLikesCount(prev => nextLiked ? prev + 1 : prev - 1)
    await toggleLike(selectedPost.id)
  }

  const displayUsers = hasSearched ? searchedUsers : initialUsers
  const displayPosts = hasSearched ? searchedPosts : initialPosts

  const getMediaClass = (mediaType?: string | null) => {
    switch (mediaType) {
      case 'aurora': return 'aurora'
      case 'mars-landscape': return 'mars-landscape'
      case 'ocean': return 'ocean'
      default: return 'aurora'
    }
  }

  return (
    <div>
      {/* ───────── Robust Search Engine Bar ───────── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--panel)',
          border: '1.5px solid var(--line)',
          borderRadius: '100px',
          padding: '6px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          transition: 'border-color 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
        }}>
          <span style={{ fontSize: '1.2rem', marginRight: '12px', color: 'var(--earth)' }}>
            🔍
          </span>
          <input
            autoFocus
            type="text"
            placeholder="Search space anomalies, signals, or users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '1rem',
              outline: 'none',
              padding: '10px 0'
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'rgba(0,0,0,0.08)',
                border: 'none',
                color: 'var(--muted)',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '14px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          paddingBottom: '4px'
        }}>
          {[
            { id: 'all', label: 'All Transmissions', icon: '🪐' },
            { id: 'media', label: 'Visual Media & Reels', icon: '📷' },
            { id: 'people', label: 'Astronauts & Explorers', icon: '👨‍🚀' },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              style={{
                padding: '6px 16px',
                borderRadius: '100px',
                border: '1px solid',
                borderColor: activeFilter === filter.id ? 'var(--earth)' : 'var(--line)',
                background: activeFilter === filter.id ? 'rgba(64, 201, 162, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: activeFilter === filter.id ? 'var(--earth)' : 'var(--muted)',
                fontSize: '0.8rem',
                fontWeight: activeFilter === filter.id ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading state indicator */}
      {isSearching && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: '0.88rem' }}>
          Scanning cosmic frequencies for &quot;{query}&quot;...
        </div>
      )}

      {/* ───────── Active Explorers Horizontal Carousel ───────── */}
      {(activeFilter === 'all' || activeFilter === 'people') && displayUsers.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
              {hasSearched ? `Astronauts Matching "${query}"` : 'Active Explorers'}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {displayUsers.length} discovered
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: '14px',
            overflowX: 'auto',
            paddingBottom: '8px',
            scrollbarWidth: 'none'
          }}>
            {displayUsers.map((user) => (
              <div
                key={user.id}
                style={{
                  minWidth: '170px',
                  maxWidth: '190px',
                  padding: '16px',
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  borderRadius: '20px',
                  textAlign: 'center',
                  flexShrink: 0,
                  backdropFilter: 'blur(12px)',
                  transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease, border-color 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                }}
              >
                <Link href={`/profile/${user.handle}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: '10px' }}>
                  <div
                    className={`user-avatar ${user.color || 'green'}`}
                    style={{ width: '54px', height: '54px', margin: '0 auto 10px', fontSize: '1.25rem', color: 'white' }}
                  >
                    {user.avatarUrl || user.username?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.username}
                  </div>
                  <div style={{ color: 'var(--earth)', fontSize: '0.76rem', marginBottom: '10px' }}>
                    @{user.handle}
                  </div>
                  {user.location && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      📍 {user.location}
                    </div>
                  )}
                </Link>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!currentUserId) return;
                    await toggleFollow(user.id);
                  }}
                  style={{
                    width: '100%',
                    display: 'block',
                    padding: '6px 14px',
                    borderRadius: '100px',
                    background: user.followers?.some((f:any)=>f.followerId===currentUserId) ? 'rgba(255,255,255,0.08)' : 'rgba(64, 201, 162, 0.15)',
                    border: '1px solid',
                    borderColor: user.followers?.some((f:any)=>f.followerId===currentUserId) ? 'var(--line)' : 'var(--earth)',
                    color: user.followers?.some((f:any)=>f.followerId===currentUserId) ? 'var(--text)' : 'var(--earth)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                  }}
                >
                  {user.followers?.some((f:any)=>f.followerId===currentUserId) ? 'Following' : 'Connect ↗'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────── Instagram-Style Visual Discovery Grid ───────── */}
      {(activeFilter === 'all' || activeFilter === 'media') && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
              {hasSearched ? `Transmissions Matching "${query}"` : 'Transmissions Mosaic'}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {displayPosts.length} media units
            </span>
          </div>

          {displayPosts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '50px 20px',
              background: 'var(--panel)',
              borderRadius: '20px',
              border: '1px dashed var(--line)',
              color: 'var(--muted)'
            }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🛰️</span>
              No transmissions found for &quot;{query}&quot;. Try exploring other keywords.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '14px',
              gridAutoFlow: 'dense'
            }}>
              {displayPosts.map((post, idx) => {
                // Every 7th post becomes a 2x2 featured tile if grid supports it
                const isFeatured = idx % 7 === 0 && displayPosts.length > 4

                return (
                  <div
                    key={post.id}
                    onClick={() => openPostModal(post)}
                    style={{
                      position: 'relative',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      aspectRatio: isFeatured ? '1' : '1',
                      gridColumn: isFeatured ? 'span 2' : 'span 1',
                      gridRow: isFeatured ? 'span 2' : 'span 1',
                      border: '1px solid var(--line)',
                      background: '#040a14',
                      boxShadow: 'var(--shadow)',
                      cursor: 'pointer',
                      transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease, box-shadow 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)'
                      e.currentTarget.style.zIndex = '5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.zIndex = '1'
                    }}
                  >
                    {/* Media Image / Shader */}
                    {post.mediaUrl ? (
                      <img
                        src={post.mediaUrl}
                        alt="Transmission Media"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className={`post-media ${getMediaClass(post.mediaType)}`}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}

                    {/* Sector Badge Top Left */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: 'rgba(7, 17, 31, 0.7)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid var(--line)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--earth)',
                      textTransform: 'uppercase'
                    }}>
                      {post.channel || 'earth'}
                    </div>

                    {/* Instagram-style Hover/Permanent Overlay */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 40%, rgba(4, 10, 20, 0.95) 90%)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: '16px',
                      pointerEvents: 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div className={`user-avatar ${post.author?.color || 'green'}`} style={{ width: '26px', height: '26px', fontSize: '0.72rem' }}>
                          {post.author?.avatarUrl || post.author?.username?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>
                          @{post.author?.handle}
                        </span>
                      </div>

                      <p style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        margin: '0 0 6px 0'
                      }}>
                        {post.content}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--muted)' }}>
                        <span>♥ {post.likes?.length || 0}</span>
                        <span>💬 {post.reelComments?.length || 0} notes</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────── Full Instagram-Style Post Detail Modal ───────── */}
      {selectedPost && (
        <div
          onClick={() => setSelectedPost(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(3, 8, 18, 0.85)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              background: '#07111f',
              border: '1px solid var(--line)',
              borderRadius: '26px',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Modal Left: Media */}
            <div style={{
              position: 'relative',
              background: '#02060e',
              minHeight: '340px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedPost.mediaUrl ? (
                <img
                  src={selectedPost.mediaUrl}
                  alt="Modal Media"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '550px' }}
                />
              ) : (
                <div
                  className={`post-media ${getMediaClass(selectedPost.mediaType)}`}
                  style={{ width: '100%', height: '100%', minHeight: '340px' }}
                />
              )}
            </div>

            {/* Modal Right: Details & Discussion */}
            <div style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              maxHeight: '550px',
              overflowY: 'auto'
            }}>
              <div>
                {/* Header: Author Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={`user-avatar ${selectedPost.author?.color || 'green'}`} style={{ width: '40px', height: '40px', fontSize: '0.95rem' }}>
                      {selectedPost.author?.avatarUrl || selectedPost.author?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedPost.author?.username}</div>
                      <div style={{ color: 'var(--earth)', fontSize: '0.78rem' }}>@{selectedPost.author?.handle}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPost(null)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      color: 'var(--muted)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Content */}
                <p style={{ fontSize: '0.94rem', lineHeight: 1.55, color: '#f3f7fb', marginBottom: '20px' }}>
                  {selectedPost.content}
                </p>

                {/* Sector Information */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--earth)', background: 'rgba(64, 201, 162, 0.1)', padding: '4px 10px', borderRadius: '100px', border: '1px solid rgba(64, 201, 162, 0.2)' }}>
                    Sector: {selectedPost.channel || 'earth'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: '100px' }}>
                    {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Localized Notes on Reel */}
                {selectedPost.reelComments?.length > 0 && (
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                      Localized Notes ({selectedPost.reelComments.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                      {selectedPost.reelComments.map((c: any) => (
                        <div key={c.id} style={{ padding: '8px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--earth)', fontWeight: 600 }}>@{c.user?.handle || 'astronaut'}: </span>
                          <span>{c.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={handleModalLike}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: selectedPostLiked ? 'rgba(255, 107, 122, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid',
                    borderColor: selectedPostLiked ? 'var(--danger)' : 'var(--line)',
                    color: selectedPostLiked ? 'var(--danger)' : 'var(--text)',
                    padding: '8px 16px',
                    borderRadius: '100px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.88rem'
                  }}
                >
                  <span>{selectedPostLiked ? '♥' : '♡'}</span>
                  <span>{selectedPostLikesCount} Likes</span>
                </button>

                <Link
                  href="/reels"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '100px',
                    background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                    color: '#07111f',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    textDecoration: 'none'
                  }}
                >
                  View in Reels Mode ▶
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
