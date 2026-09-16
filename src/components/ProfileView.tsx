'use client'

import { useState } from 'react'
import Link from 'next/link'
import Post from './Post'
import { updateProfile, updateAvatar } from '../app/actions'
import UploadButton from './UploadButton'

interface ProfileViewProps {
  user: any
  savedPosts: any[]
  currentUserId?: string
  onLogout?: () => Promise<void>
}

export default function ProfileView({ user, savedPosts, currentUserId, onLogout }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'transmissions' | 'saved' | 'followers' | 'following' | 'settings'>('transmissions')
  const [activePostForModal, setActivePostForModal] = useState<any>(null)
  const [loggingOut, setLoggingOut] = useState(false)
    const [showProfileOptions, setShowProfileOptions] = useState(false)

  const isCurrentUser = currentUserId === user.id

  const handleLogoutClick = async () => {
    if (!onLogout) return
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
          {user.avatarUrl?.startsWith?.('http') ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (user.avatarUrl || user.username?.charAt(0).toUpperCase() || '✦')}
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isCurrentUser && currentUserId && (
            <>
              <button
                onClick={async () => {
                  const { toggleFollow } = await import('../app/actions');
                  await toggleFollow(user.id);
                  window.location.reload();
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '100px',
                  background: 'var(--panel)',
                  border: '1px solid var(--earth)',
                  color: 'var(--earth)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {user.followers?.some((f: any) => f.followerId === currentUserId) ? 'Unfollow' : 'Follow'}
              </button>
              <Link
                href={`/chat`}
                style={{
                  padding: '8px 18px',
                  borderRadius: '100px',
                  background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                  border: 'none',
                  color: '#07111f',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(64, 201, 162, 0.3)'
                }}
              >
                <span>💬</span>
                <span>Message</span>
              </Link>
            </>
          )}

          {isCurrentUser && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowProfileOptions(!showProfileOptions)}
                style={{
                  padding: '8px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
              {showProfileOptions && (
                <div style={{
                  position: 'absolute', top: '110%', right: '0', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px',
                  padding: '8px', zIndex: 100, minWidth: '180px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  <button onClick={() => { setActiveTab('settings'); setShowProfileOptions(false) }} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem' }}>Edit Profile</button>
                  <button onClick={() => { setActiveTab('saved'); setShowProfileOptions(false) }} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem' }}>Private Saves</button>
                  <button onClick={() => { handleLogoutClick(); setShowProfileOptions(false) }} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem' }}>Logout</button>
                </div>
              )}
            </div>
          )}
        </div>
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
          { label: 'Followers', value: user.followers?.length || 0, tab: 'followers' },
          { label: 'Following', value: user.following?.length || 0, tab: 'following' },
          { label: 'Saved', value: savedPosts?.length || 0, tab: 'saved' },
        ].filter(stat => stat.tab !== 'saved' || isCurrentUser).map((stat, i) => (
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
              transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
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
        paddingBottom: '2px',
        overflowX: 'auto',
        scrollbarWidth: 'none'
      }}>
        {[
          { id: 'transmissions', label: 'Transmissions', icon: '📡', show: true },
          { id: 'saved', label: isCurrentUser ? 'Saved Cache' : 'Public Saves', icon: '🔖', show: true },
          { id: 'followers', label: 'Followers', icon: '👥', show: true },
          { id: 'following', label: 'Following', icon: '👣', show: true },
          
        ].filter(t => t.show).map(tab => (
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
              transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ───────── Grid Rendering Logic ───────── */}
      {(activeTab === 'transmissions' || activeTab === 'saved') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
          {activeTab === 'transmissions' && user.posts?.length === 0 && (
            <div style={{ gridColumn: 'span 3', padding: '40px', textAlign: 'center', color: 'var(--muted)', background: 'var(--panel)', borderRadius: '20px' }}>
              No transmissions yet.
            </div>
          )}
          {activeTab === 'saved' && savedPosts?.length === 0 && (
            <div style={{ gridColumn: 'span 3', padding: '40px', textAlign: 'center', color: 'var(--muted)', background: 'var(--panel)', borderRadius: '20px' }}>
              Archive is empty.
            </div>
          )}

          {(activeTab === 'transmissions' ? user.posts : savedPosts?.map((s: any) => s.post).filter(Boolean))?.map((post: any) => (
            <div 
              key={post.id} 
              onClick={() => setActivePostForModal({...post, author: activeTab === 'transmissions' ? user : post.author})}
              style={{ width: '100%', aspectRatio: '1', background: 'var(--panel)', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
            >
              {post.mediaUrl ? (
                post.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) || post.mediaUrl.includes('#video') ? (
                  <video src={post.mediaUrl.split(',')[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={post.mediaUrl.split(',')[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: '2rem' }}>🪐</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Post Modal */}
      {activePostForModal && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)', overflowY: 'auto' }}
          onClick={() => setActivePostForModal(null)}
        >
          <div style={{ position: 'absolute', top: '20px', right: '20px', color: 'white', fontSize: '2rem', cursor: 'pointer', zIndex: 10001 }}>✕</div>
          <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }} onClick={e => e.stopPropagation()}>
            <Post post={activePostForModal} currentUserId={currentUserId} />
          </div>
        </div>
      )}

      {/* ───────── Tab: Followers ───────── */}
      {activeTab === 'followers' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {(!user.followers || user.followers.length === 0) ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--line)' }}>
              No followers yet.
            </div>
          ) : (
            user.followers.map((f: any) => {
              const follower = f.follower
              if (!follower) return null
              return (
                <div key={follower.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--line)' }}>
                  <div className={`user-avatar ${follower.color || 'green'}`} style={{ width: '46px', height: '46px', fontSize: '1.2rem' }}>
                    {follower.avatarUrl?.startsWith?.('http') ? <img src={follower.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (follower.avatarUrl || follower.username?.charAt(0).toUpperCase())}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>{follower.username}</div>
                    <div style={{ color: 'var(--earth)', fontSize: '0.8rem' }}>@{follower.handle}</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <Link href="/chat" style={{ padding: '6px 14px', borderRadius: '100px', background: 'rgba(64, 201, 162, 0.15)', color: 'var(--earth)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
                      Signal
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ───────── Tab: Following ───────── */}
      {activeTab === 'following' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {(!user.following || user.following.length === 0) ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--line)' }}>
              Not following anyone yet.
            </div>
          ) : (
            user.following.map((f: any) => {
              const followed = f.following
              if (!followed) return null
              return (
                <div key={followed.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--line)' }}>
                  <div className={`user-avatar ${followed.color || 'green'}`} style={{ width: '46px', height: '46px', fontSize: '1.2rem' }}>
                    {followed.avatarUrl?.startsWith?.('http') ? <img src={followed.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (followed.avatarUrl || followed.username?.charAt(0).toUpperCase())}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>{followed.username}</div>
                    <div style={{ color: 'var(--earth)', fontSize: '0.8rem' }}>@{followed.handle}</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <Link href="/chat" style={{ padding: '6px 14px', borderRadius: '100px', background: 'rgba(64, 201, 162, 0.15)', color: 'var(--earth)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
                      Signal
                    </Link>
                  </div>
                </div>
              )
            })
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.25rem', marginBottom: '6px' }}>
                  Account Parameters
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: 0 }}>
                  Your quantum credentials registered across the Upabode network.
                </p>
              </div>
              <button 
                onClick={async () => {
                  if (isEditing) {
                    setEditStatus('Saving...');
                                        const fd = new FormData();
                    fd.append('username', editForm.username);
                    fd.append('handle', editForm.handle);
                    const res = await updateProfile(fd);
                    if (res.error) setEditStatus(res.error);
                    else { setEditStatus('Saved!'); setIsEditing(false); window.location.reload(); }
                  } else {
                    setIsEditing(true);
                  }
                }}
                style={{ background: isEditing ? 'var(--earth)' : 'rgba(255,255,255,0.1)', color: isEditing ? '#000' : '#fff', border: 'none', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>

            {editStatus && <div style={{ color: editStatus === 'Saved!' ? 'var(--earth)' : 'var(--danger)', fontSize: '0.8rem' }}>{editStatus}</div>}

            <div style={{ display: 'grid', gap: '14px' }}>
              {/* Avatar Uploader */}
              <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className={`user-avatar ${user.color}`} style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                    {user.avatarUrl?.startsWith?.('http') ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (user.avatarUrl || user.username.charAt(0))}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Profile Avatar</div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--earth)' }}>Update Display Picture</div>
                  </div>
                </div>
                <div style={{ width: '100px', height: '40px', overflow: 'hidden' }}>
                  <UploadButton
                    endpoint="mediaUploader"
                    onClientUploadComplete={async (res: any) => {
                      if (res && res[0]) {
                                                await updateAvatar(res[0].url);
                        window.location.reload();
                      }
                    }}
                    appearance={{
                      button: { background: 'var(--earth)', color: '#000', fontSize: '0.8rem', padding: '0 10px', height: '40px', width: '100%' },
                      allowedContent: { display: 'none' }
                    }}
                    content={{ button: 'Upload' }}
                  />
                </div>
              </div>

              <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Username</div>
                  {isEditing ? (
                    <input 
                      value={editForm.username} 
                      onChange={e => setEditForm({...editForm, username: e.target.value})} 
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--line)', color: '#fff', padding: '4px 8px', borderRadius: '6px', width: '100%', marginTop: '4px' }} 
                    />
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>{user.username}</div>
                  )}
                </div>
                {!isEditing && <span style={{ fontSize: '0.74rem', color: 'var(--earth)' }}>Active</span>}
              </div>

              <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Cosmic Handle</div>
                  {isEditing ? (
                    <input 
                      value={editForm.handle} 
                      onChange={e => setEditForm({...editForm, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()})} 
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--line)', color: '#fff', padding: '4px 8px', borderRadius: '6px', width: '100%', marginTop: '4px' }} 
                    />
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>@{user.handle}</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
    </div>
  )
}






