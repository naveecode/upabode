'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Post from './Post'
import { updateProfile, updateAvatar, toggleFollow, startChat } from '../app/actions'
import { UploadButton, useUploadThing } from './UploadButton'
import { compressImage, validateMediaType } from '../lib/mediaCompressor'

interface ProfileViewProps {
  user: any
  savedPosts: any[]
  currentUserId?: string
  onLogout?: () => Promise<void>
}

export default function ProfileView({ user, savedPosts, currentUserId, onLogout }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'transmissions' | 'saved' | 'followers' | 'following' | 'settings'>('transmissions')
  const [activePostForModal, setActivePostForModal] = useState<any>(null)
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [showProfileOptions, setShowProfileOptions] = useState(false)

  const isCurrentUser = currentUserId === user.id
  const [isEditing, setIsEditing] = useState(false)

  const handleDirectChat = async () => {
    try {
      const res = await startChat(user.id)
      if (res && res.chatId) {
        router.push(`/chat/${res.chatId}`)
      } else {
        router.push('/chat')
      }
    } catch {
      router.push('/chat')
    }
  }
  
  const initialUsername = (user?.username?.startsWith('http') || (user?.username && user.username.length > 35))
    ? (user?.handle || 'Cosmic Traveler')
    : (user?.username || '')

  const [editForm, setEditForm] = useState({ username: initialUsername, handle: user?.handle || '' })
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const { startUpload } = useUploadThing('mediaUploader', {
    onClientUploadComplete: async (res) => {
      if (res && res[0]) {
        await updateAvatar(res[0].url)
        window.location.reload()
      }
      setIsUploadingAvatar(false)
    },
    onUploadError: (err) => {
      alert(`Avatar upload error: ${err.message}`)
      setIsUploadingAvatar(false)
    }
  })

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateMediaType(file)
    if (!validation.valid || validation.type !== 'image') {
      alert(validation.error || 'Please select a valid image file.')
      return
    }
    try {
      setIsUploadingAvatar(true)
      const croppedAndCompressed = await compressImage(file, {
        cropSquare: true,
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.9
      })
      await startUpload([croppedAndCompressed])
    } catch (err: any) {
      alert('Failed to process image: ' + err.message)
      setIsUploadingAvatar(false)
    }
  }
  const [editStatus, setEditStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [isFollowingUser, setIsFollowingUser] = useState(
    user.followers?.some((f: any) => f.followerId === currentUserId) ?? false
  )

  const handleLogoutClick = async () => {
    if (!onLogout) return
    setLoggingOut(true)
    await onLogout()
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setEditStatus('Saving...')
    try {
      const fd = new FormData()
      fd.append('username', editForm.username.trim())
      fd.append('handle', editForm.handle.trim())
      const res = await updateProfile(fd)
      if (res.error) {
        setEditStatus(res.error)
      } else {
        setEditStatus('Profile updated successfully!')
        setIsEditing(false)
        window.location.reload()
      }
    } catch (e: any) {
      setEditStatus('Error updating profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="profile-page" style={{ maxWidth: '780px', margin: '0 auto', padding: '24px 16px 90px' }}>
      {/* ───────── Profile Hero Header ───────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '24px',
        background: 'var(--panel)',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid var(--line)',
        backdropFilter: 'blur(16px)',
        flexWrap: 'wrap'
      }}>
        <div
          className={`user-avatar ${user.color || 'green'}`}
          style={{ width: '76px', height: '76px', fontSize: '2rem', fontWeight: 800, flexShrink: 0, boxShadow: '0 0 30px rgba(197, 160, 89, 0.25)' }}
        >
          {user.avatarUrl?.startsWith?.('http') ? (
            <img src={user.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" />
          ) : (
            user.avatarUrl || user.username?.charAt(0).toUpperCase() || '✦'
          )}
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.5rem', margin: 0, fontWeight: 700, wordBreak: 'break-word' }}>
              {user.username?.startsWith('http') ? user.handle : user.username}
            </h1>
            <span style={{ fontSize: '0.72rem', background: 'rgba(197, 160, 89, 0.15)', color: 'var(--earth)', padding: '3px 10px', borderRadius: '100px', fontWeight: 700 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isCurrentUser && currentUserId && (
            <>
              <button
                onClick={async () => {
                  setIsFollowingUser(!isFollowingUser)
                  await toggleFollow(user.id)
                }}
                style={{
                  padding: '8px 20px',
                  borderRadius: '100px',
                  background: isFollowingUser ? 'transparent' : 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                  border: isFollowingUser ? '1px solid var(--earth)' : 'none',
                  color: isFollowingUser ? 'var(--earth)' : '#07111f',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: '0.2s ease'
                }}
              >
                {isFollowingUser ? 'Unfollow' : 'Follow'}
              </button>
              <button
                onClick={handleDirectChat}
                style={{
                  padding: '8px 18px',
                  borderRadius: '100px',
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>💬</span>
                <span>Signal</span>
              </button>
            </>
          )}

          {isCurrentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  setActiveTab('settings')
                  setIsEditing(true)
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '100px',
                  background: 'var(--panel)',
                  border: '1.5px solid var(--earth)',
                  color: 'var(--earth)',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
              >
                Edit Profile
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowProfileOptions(!showProfileOptions)}
                  style={{
                    padding: '8px',
                    borderRadius: '50%',
                    background: 'rgba(28, 25, 20, 0.05)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label="Profile options"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>
                {showProfileOptions && (
                  <div style={{
                    position: 'absolute', top: '110%', right: '0', background: 'var(--panel-solid)', border: '1px solid var(--line)', borderRadius: '12px',
                    padding: '8px', zIndex: 100, minWidth: '180px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '4px'
                  }}>
                    <button onClick={() => { setActiveTab('settings'); setIsEditing(true); setShowProfileOptions(false) }} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem' }}>Edit Parameters</button>
                    <button onClick={() => { setActiveTab('saved'); setShowProfileOptions(false) }} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem' }}>Private Saves</button>
                    <button onClick={() => { handleLogoutClick(); setShowProfileOptions(false) }} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem' }}>Logout</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───────── Stats Strip ───────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Signals', value: user.posts?.length || 0, tab: 'transmissions' },
          { label: 'Followers', value: user.followers?.length || 0, tab: 'followers' },
          { label: 'Following', value: user.following?.length || 0, tab: 'following' },
          { label: 'Saved', value: savedPosts?.length || 0, tab: 'saved' },
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => stat.tab && setActiveTab(stat.tab as any)}
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '12px 8px',
              textAlign: 'center',
              cursor: stat.tab ? 'pointer' : 'default',
              transition: '0.2s ease'
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ───────── Tabs Navigation ───────── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--line)',
        marginBottom: '20px',
        paddingBottom: '2px',
        overflowX: 'auto',
        scrollbarWidth: 'none'
      }}>
        {[
          { id: 'transmissions', label: 'Transmissions', icon: '📡', show: true },
          { id: 'saved', label: isCurrentUser ? 'Saved Cache' : 'Public Saves', icon: '🔖', show: true },
          { id: 'followers', label: 'Followers', icon: '👥', show: true },
          { id: 'following', label: 'Following', icon: '👣', show: true },
          { id: 'settings', label: 'Edit Profile', icon: '⚙️', show: isCurrentUser },
        ].filter(t => t.show).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any)
              if (tab.id === 'settings') setIsEditing(true)
            }}
            style={{
              padding: '10px 16px',
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
              transition: '0.2s ease',
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
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

          {(activeTab === 'transmissions' ? user.posts : (isCurrentUser ? savedPosts : savedPosts?.filter(s => s.isPublic))?.map((s: any) => s.post).filter(Boolean))?.map((post: any) => (
            <div 
              key={post.id} 
              onClick={() => setActivePostForModal({...post, author: activeTab === 'transmissions' ? user : post.author})}
              style={{ width: '100%', aspectRatio: '1', background: 'var(--panel)', cursor: 'pointer', overflow: 'hidden', position: 'relative', borderRadius: '8px' }}
            >
              {post.mediaUrl ? (
                post.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) || post.mediaUrl.includes('#video') ? (
                  <video src={post.mediaUrl.split(',')[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={post.mediaUrl.split(',')[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Post thumbnail" />
                )
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.4rem', marginBottom: '4px' }}>📝</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.content}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Post Modal */}
      {activePostForModal && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', overflowY: 'auto' }}
          onClick={() => setActivePostForModal(null)}
        >
          <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'white', fontSize: '1.8rem', cursor: 'pointer', zIndex: 10001, width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(0,0,0,0.5)' }}>✕</div>
          <div style={{ maxWidth: '600px', margin: '40px auto', padding: '16px' }} onClick={e => e.stopPropagation()}>
            <Post post={activePostForModal} currentUserId={currentUserId} />
          </div>
        </div>
      )}

      {/* ───────── Tab: Followers ───────── */}
      {activeTab === 'followers' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {(!user.followers || user.followers.length === 0) ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--line)' }}>
              No followers yet.
            </div>
          ) : (
            user.followers.map((f: any) => {
              const follower = f.follower
              if (!follower) return null
              return (
                <div key={follower.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--line)' }}>
                  <div className={`user-avatar ${follower.color || 'green'}`} style={{ width: '44px', height: '44px', fontSize: '1.1rem' }}>
                    {follower.avatarUrl?.startsWith?.('http') ? <img src={follower.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (follower.avatarUrl || follower.username?.charAt(0).toUpperCase())}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{follower.username}</div>
                    <div style={{ color: 'var(--earth)', fontSize: '0.8rem' }}>@{follower.handle}</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <Link href={`/profile/${follower.handle}`} style={{ padding: '6px 14px', borderRadius: '100px', background: 'rgba(197, 160, 89, 0.15)', color: 'var(--earth)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
                      View
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
        <div style={{ display: 'grid', gap: '10px' }}>
          {(!user.following || user.following.length === 0) ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--line)' }}>
              Not following anyone yet.
            </div>
          ) : (
            user.following.map((f: any) => {
              const followed = f.following
              if (!followed) return null
              return (
                <div key={followed.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--line)' }}>
                  <div className={`user-avatar ${followed.color || 'green'}`} style={{ width: '44px', height: '44px', fontSize: '1.1rem' }}>
                    {followed.avatarUrl?.startsWith?.('http') ? <img src={followed.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (followed.avatarUrl || followed.username?.charAt(0).toUpperCase())}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{followed.username}</div>
                    <div style={{ color: 'var(--earth)', fontSize: '0.8rem' }}>@{followed.handle}</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <Link href={`/profile/${followed.handle}`} style={{ padding: '6px 14px', borderRadius: '100px', background: 'rgba(197, 160, 89, 0.15)', color: 'var(--earth)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
                      View
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ───────── Tab: Settings & Edit Profile ───────── */}
      {activeTab === 'settings' && isCurrentUser && (
        <div style={{
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '1.3rem', margin: '0 0 4px', fontWeight: 700 }}>
                Edit Astronaut Profile
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: 0 }}>
                Update your display name, handle, and avatar across Upabode.
              </p>
            </div>
            <button 
              onClick={handleSaveProfile}
              disabled={isSaving}
              style={{
                background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                color: '#07111f',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '100px',
                cursor: isSaving ? 'wait' : 'pointer',
                fontSize: '0.88rem',
                fontWeight: 700,
                boxShadow: '0 4px 15px rgba(197, 160, 89, 0.3)',
                transition: '0.2s'
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {editStatus && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: editStatus.includes('success') ? 'rgba(197, 160, 89, 0.12)' : 'rgba(184, 92, 92, 0.12)',
              color: editStatus.includes('success') ? 'var(--earth)' : 'var(--danger)',
              border: `1px solid ${editStatus.includes('success') ? 'var(--earth)' : 'var(--danger)'}`
            }}>
              {editStatus}
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Avatar Uploader */}
            <div style={{ padding: '16px 20px', background: 'var(--panel-solid)', borderRadius: '16px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className={`user-avatar ${user.color}`} style={{ width: '60px', height: '60px', fontSize: '1.5rem', flexShrink: 0 }}>
                  {user.avatarUrl?.startsWith?.('http') ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (user.avatarUrl || user.username.charAt(0))}
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Profile Avatar</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--earth)', marginTop: '2px' }}>Upload Display Picture</div>
                </div>
              </div>
              <div style={{ minWidth: '130px' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--earth)',
                  color: '#07111f',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '10px 18px',
                  borderRadius: '100px',
                  cursor: isUploadingAvatar ? 'wait' : 'pointer',
                  opacity: isUploadingAvatar ? 0.7 : 1,
                  boxShadow: '0 2px 10px rgba(197, 160, 89, 0.3)',
                  transition: '0.2s ease',
                  userSelect: 'none'
                }}>
                  {isUploadingAvatar ? 'Cropping & Uploading...' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingAvatar}
                    style={{ display: 'none' }}
                    onChange={handleAvatarFileSelect}
                  />
                </label>
              </div>
            </div>

            {/* Username Input */}
            <div style={{ padding: '16px 20px', background: 'var(--panel-solid)', borderRadius: '16px', border: '1px solid var(--line)' }}>
              <label htmlFor="username-input" style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontWeight: 700 }}>
                Username / Display Name
              </label>
              <input 
                id="username-input"
                type="text"
                maxLength={35}
                value={editForm.username} 
                onChange={e => setEditForm({...editForm, username: e.target.value})} 
                placeholder="Enter display name"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 14px',
                  background: 'var(--background)',
                  border: '1.5px solid var(--earth)',
                  borderRadius: '10px',
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px' }}>
                Shown on your transmissions, signals, and public profile.
              </div>
            </div>

            {/* Cosmic Handle Input */}
            <div style={{ padding: '16px 20px', background: 'var(--panel-solid)', borderRadius: '16px', border: '1px solid var(--line)' }}>
              <label htmlFor="handle-input" style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontWeight: 700 }}>
                Cosmic Handle
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--earth)', fontWeight: 800, fontSize: '16px', pointerEvents: 'none' }}>@</span>
                <input 
                  id="handle-input"
                  type="text"
                  maxLength={25}
                  value={editForm.handle} 
                  onChange={e => setEditForm({...editForm, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()})} 
                  placeholder="cosmic_handle"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 14px 12px 32px',
                    background: 'var(--background)',
                    border: '1.5px solid var(--earth)',
                    borderRadius: '10px',
                    color: 'var(--text)',
                    fontSize: '16px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px' }}>
                Unique handle used for mentions, search, and direct links.
              </div>
            </div>

            {/* Save Button bottom */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                style={{
                  background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                  color: '#07111f',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: '100px',
                  cursor: isSaving ? 'wait' : 'pointer',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 18px rgba(197, 160, 89, 0.35)',
                  width: '100%'
                }}
              >
                {isSaving ? 'Saving Changes...' : 'Save Profile Parameters'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
