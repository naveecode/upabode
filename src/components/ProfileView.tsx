'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ProfileViewProps {
  user: any
  savedPosts: any[]
  onLogout: () => Promise<void>
}

export default function ProfileView({ user, savedPosts, onLogout }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'transmissions' | 'saved' | 'settings'>('transmissions')
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogoutClick = async () => {
    setLoggingOut(true)
    await onLogout()
  }

  const getMediaClass = (mediaType?: string | null) => {
    switch (mediaType) {
      case 'aurora': return 'aurora'
      case 'mars-landscape': return 'mars-landscape'
      case 'ocean': return 'ocean'
      default: return 'aurora'
    }
  }

  return (
    <div className="profile-page" style={{ maxWidth: '780px', margin: '0 auto', padding: '30px 20px 90px' }}>
      {/* ───────── Profile Hero Header ───────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '28px',
        background: 'var(--panel)',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid var(--line)',
        backdropFilter: 'blur(16px)',
        flexWrap: 'wrap'
      }}>
        <div
          className={`user-avatar ${user.color || 'green'}`}
          style={{ width: '80px', height: '80px', fontSize: '2rem', fontWeight: 800, flexShrink: 0, boxShadow: '0 0 30px rgba(64, 201, 162, 0.25)' }}
        >
          {user.avatarUrl || user.username?.charAt(0).toUpperCase() || '✦'}
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.6rem', margin: 0, fontWeight: 700 }}>
              {user.username}
            </h1>
            <span style={{ fontSize: '0.72rem', background: 'rgba(64, 201, 162, 0.15)', color: 'var(--earth)', padding: '3px 10px', borderRadius: '100px', fontWeight: 700 }}>
              Astronaut
            </span>
          </div>
          <div style={{ color: 'var(--earth)', fontSize: '0.88rem', marginBottom: '6px' }}>
            @{user.handle}
          </div>
          {user.location && (
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📍</span> {user.location}
            </div>
          )}
        </div>

        {/* Quick Settings Action */}
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '8px 16px',
            borderRadius: '100px',
            background: activeTab === 'settings' ? 'rgba(64, 201, 162, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid',
            borderColor: activeTab === 'settings' ? 'var(--earth)' : 'var(--line)',
            color: activeTab === 'settings' ? 'var(--earth)' : 'var(--text)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </div>

      {/* ───────── Stats Strip ───────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '26px'
      }}>
        {[
          { label: 'Signals', value: user.posts?.length || 0, tab: 'transmissions' },
          { label: 'Followers', value: user.followers?.length || 0 },
          { label: 'Following', value: user.following?.length || 0 },
          { label: 'Saved', value: savedPosts?.length || 0, tab: 'saved' },
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => stat.tab && setActiveTab(stat.tab as any)}
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '14px',
              textAlign: 'center',
              cursor: stat.tab ? 'pointer' : 'default',
              transition: '0.15s ease'
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ───────── Tabs Navigation ───────── */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '1px solid var(--line)',
        marginBottom: '22px',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'transmissions', label: 'Transmissions', icon: '📡' },
          { id: 'saved', label: 'Saved Cache', icon: '🔖' },
          { id: 'settings', label: 'Settings & Security', icon: '⚙️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 18px',
              borderBottom: '2px solid',
              borderColor: activeTab === tab.id ? 'var(--earth)' : 'transparent',
              color: activeTab === tab.id ? 'var(--earth)' : 'var(--muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.88rem',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: '0.15s ease'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ───────── Tab 1: Transmissions ───────── */}
      {activeTab === 'transmissions' && (
        <div>
          {user.posts?.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: 'var(--panel)',
              borderRadius: '20px',
              border: '1px dashed var(--line)',
              color: 'var(--muted)'
            }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🪐</span>
              No transmissions broadcasted yet.<br />Share your first signal from the Home feed!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
              {user.posts.map((post: any) => (
                <div
                  key={post.id}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid var(--line)',
                    background: '#040a14'
                  }}
                >
                  {post.mediaUrl ? (
                    <img src={post.mediaUrl} alt="Post" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div className={`post-media ${getMediaClass(post.mediaType)}`} style={{ width: '100%', height: '100%' }} />
                  )}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, transparent 40%, rgba(4, 10, 20, 0.9) 90%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '12px'
                  }}>
                    <p style={{
                      fontSize: '0.78rem',
                      color: 'white',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {post.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────── Tab 2: Saved Cache ───────── */}
      {activeTab === 'saved' && (
        <div>
          {savedPosts?.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: 'var(--panel)',
              borderRadius: '20px',
              border: '1px dashed var(--line)',
              color: 'var(--muted)'
            }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🔖</span>
              Your Saved Archive is currently empty.<br />Swipe left on any reel or post to bookmark it here!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
              {savedPosts.map((saved: any) => {
                const post = saved.post
                if (!post) return null
                return (
                  <div
                    key={saved.id}
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid var(--line)',
                      background: '#040a14'
                    }}
                  >
                    {post.mediaUrl ? (
                      <img src={post.mediaUrl} alt="Saved" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className={`post-media ${getMediaClass(post.mediaType)}`} style={{ width: '100%', height: '100%' }} />
                    )}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 40%, rgba(4, 10, 20, 0.9) 90%)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: '12px'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--earth)', fontWeight: 600, marginBottom: '2px' }}>
                        @{post.author?.handle}
                      </div>
                      <p style={{
                        fontSize: '0.78rem',
                        color: 'white',
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {post.content}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────── Tab 3: Settings & Security ───────── */}
      {activeTab === 'settings' && (
        <div style={{
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: '24px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px'
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.25rem', marginBottom: '6px' }}>
              Account Parameters
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: 0 }}>
              Your quantum credentials registered across the Upabode network.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Username</div>
                <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>{user.username}</div>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--earth)' }}>Active</span>
            </div>

            <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Cosmic Handle</div>
                <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>@{user.handle}</div>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Public</span>
            </div>

            <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Registered Email</div>
                <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>{user.email || 'None registered'}</div>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--earth)', background: 'rgba(64,201,162,0.1)', padding: '3px 8px', borderRadius: '6px' }}>Verified</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '8px', color: 'var(--danger)' }}>
              Session & Link Disconnect
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '16px' }}>
              Terminating the quantum link clears your encrypted session token and requires re-authenticating with your credentials.
            </p>

            <button
              onClick={handleLogoutClick}
              disabled={loggingOut}
              style={{
                padding: '12px 26px',
                borderRadius: '14px',
                background: 'rgba(255, 107, 122, 0.15)',
                border: '1.5px solid var(--danger)',
                color: 'var(--danger)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: loggingOut ? 'not-allowed' : 'pointer',
                transition: '0.2s ease'
              }}
            >
              {loggingOut ? 'Disconnecting Quantum Link...' : 'Disconnect Quantum Link (Log Out)'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
