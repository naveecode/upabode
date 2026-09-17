'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Post from './Post'
import { updateProfile, updateAvatar, toggleFollow, startChat, deleteAccount, updatePostFolder } from '../app/actions'
import { UploadButton, useUploadThing } from './UploadButton'
import { compressImage, validateMediaType } from '../lib/mediaCompressor'

interface ProfileViewProps {
  user: any
  savedPosts: any[]
  currentUserId?: string
  onLogout?: () => Promise<void>
}

export default function ProfileView({ user, savedPosts, currentUserId, onLogout }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'transmissions' | 'richtext' | 'saved' | 'followers' | 'following' | 'settings'>('transmissions')
  const [activeDossierFolder, setActiveDossierFolder] = useState<string>('All')
  const [movingPostId, setMovingPostId] = useState<string | null>(null)
  const [userPostsList, setUserPostsList] = useState<any[]>(user.posts || [])
  const [activePostForModal, setActivePostForModal] = useState<any>(null)
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [showProfileOptions, setShowProfileOptions] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [uiScale, setUiScale] = useState<'compact' | 'standard'>('compact')

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('orbit_ui_scale') as 'compact' | 'standard') || 'compact'
      setUiScale(saved)
      document.documentElement.setAttribute('data-ui-scale', saved)
      document.body.classList.toggle('compact-mode', saved === 'compact')
    } catch {}
  }, [])

  const handleUiScaleChange = (scale: 'compact' | 'standard') => {
    setUiScale(scale)
    try {
      localStorage.setItem('orbit_ui_scale', scale)
      document.documentElement.setAttribute('data-ui-scale', scale)
      document.body.classList.toggle('compact-mode', scale === 'compact')
    } catch {}
  }

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

  const mediaPosts = (userPostsList || []).filter((p: any) => p.mediaType !== 'thread' && p.mediaUrl)
  const richTextPosts = (userPostsList || []).filter((p: any) => p.mediaType === 'thread' || !p.mediaUrl)

  const getPostFolder = (post: any) => {
    if (!post?.visualFilter) return 'General'
    try {
      const parsed = JSON.parse(post.visualFilter)
      return parsed.folder || 'General'
    } catch {
      return 'General'
    }
  }

  const userDossierFolders = ['All', 'General', 'Research', 'Logs', 'Ideas', 'Personal', ...Array.from(new Set(richTextPosts.map(getPostFolder)))].filter((val, id, self) => self.indexOf(val) === id)

  const filteredRichTextPosts = richTextPosts.filter((p: any) => {
    if (activeDossierFolder === 'All') return true
    return getPostFolder(p).toLowerCase() === activeDossierFolder.toLowerCase()
  })

  const handleMoveProfileFolder = async (postId: string, newFolder: string) => {
    try {
      await updatePostFolder(postId, newFolder)
      setUserPostsList(prev => prev.map(p => {
        if (p.id !== postId) return p
        let vf: any = {}
        try { vf = JSON.parse(p.visualFilter || '{}') } catch {}
        vf.folder = newFolder
        return { ...p, visualFilter: JSON.stringify(vf) }
      }))
      setMovingPostId(null)
    } catch (err) {
      console.error('Failed to move folder:', err)
    }
  }

  const handleDownloadProfileDossierTxt = () => {
    if (filteredRichTextPosts.length === 0) {
      alert('No dossiers in this folder to download.')
      return
    }

    let text = `====================================================\n`
    text += `UPABODE DOSSIERS - @${user.handle} (${user.username})\n`
    text += `Folder: ${activeDossierFolder.toUpperCase()}\n`
    text += `Exported: ${new Date().toLocaleString()}\n`
    text += `Total Dossiers: ${filteredRichTextPosts.length}\n`
    text += `====================================================\n\n`

    filteredRichTextPosts.forEach((p: any, idx: number) => {
      const f = getPostFolder(p)
      text += `[DOSSIER #${idx + 1}]  --  FOLDER: [${f}]\n`
      text += `Date: ${new Date(p.createdAt).toLocaleString()}\n`
      text += `Channel: ${p.channel || 'earth'}\n`
      text += `Likes: ${p.likes?.length || 0}  |  Comments: ${p.reelComments?.length || 0}\n`
      text += `----------------------------------------------------\n`
      text += `${p.content}\n`
      text += `====================================================\n\n`
    })

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${user.handle}_${activeDossierFolder.toLowerCase()}_dossiers.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{user.location}</span>
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
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
                    <button onClick={() => { handleLogoutClick(); setShowProfileOptions(false) }} style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem' }}>Logout</button>
                    <div style={{ height: '1px', background: 'var(--line)', margin: '4px 0' }} />
                    <button 
                      onClick={() => { setShowProfileOptions(false); setShowDeleteModal(true) }} 
                      style={{ textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      <span>Delete Account</span>
                    </button>
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
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '8px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Signals', value: mediaPosts.length, tab: 'transmissions' },
          { label: 'Rich Texts', value: richTextPosts.length, tab: 'richtext' },
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
              padding: '10px 6px',
              textAlign: 'center',
              cursor: stat.tab ? 'pointer' : 'default',
              transition: '0.2s ease'
            }}
          >
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.66rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
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
          { 
            id: 'transmissions', 
            label: 'Transmissions', 
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, 
            show: true 
          },
          { 
            id: 'richtext', 
            label: 'Rich Texts', 
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, 
            show: true 
          },
          { 
            id: 'saved', 
            label: isCurrentUser ? 'Saved Cache' : 'Public Saves', 
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>, 
            show: true 
          },
          { 
            id: 'followers', 
            label: 'Followers', 
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>, 
            show: true 
          },
          { 
            id: 'following', 
            label: 'Following', 
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>, 
            show: true 
          },
          { 
            id: 'settings', 
            label: 'Edit Profile', 
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, 
            show: isCurrentUser 
          },
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
              fontSize: '0.86rem',
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

      {/* ───────── Transmissions (Strictly Visual Media) & Saved ───────── */}
      {(activeTab === 'transmissions' || activeTab === 'saved') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
          {activeTab === 'transmissions' && mediaPosts.length === 0 && (
            <div style={{ gridColumn: 'span 3', padding: '40px', textAlign: 'center', color: 'var(--muted)', background: 'var(--panel)', borderRadius: '20px' }}>
              No visual transmissions yet.
            </div>
          )}
          {activeTab === 'saved' && savedPosts?.length === 0 && (
            <div style={{ gridColumn: 'span 3', padding: '40px', textAlign: 'center', color: 'var(--muted)', background: 'var(--panel)', borderRadius: '20px' }}>
              Archive is empty.
            </div>
          )}

          {(activeTab === 'transmissions' ? mediaPosts : (isCurrentUser ? savedPosts : savedPosts?.filter(s => s.isPublic))?.map((s: any) => s.post).filter(Boolean))?.map((post: any) => (
            <div 
              key={post.id} 
              onClick={() => setActivePostForModal({...post, author: activeTab === 'transmissions' ? user : post.author})}
              style={{ width: '100%', aspectRatio: '1', background: 'var(--panel)', cursor: 'pointer', overflow: 'hidden', position: 'relative', borderRadius: '8px' }}
            >
              {post.mediaUrl && (
                post.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) || post.mediaUrl.includes('#video') ? (
                  <video src={post.mediaUrl.split(',')[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={post.mediaUrl.split(',')[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Post thumbnail" />
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* ───────── Dedicated Rich Texts Dossiers Tab ───────── */}
      {activeTab === 'richtext' && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
              {userDossierFolders.map(folderName => (
                <button
                  key={folderName}
                  onClick={() => setActiveDossierFolder(folderName)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '100px',
                    border: activeDossierFolder === folderName ? '1px solid var(--earth)' : '1px solid var(--line)',
                    background: activeDossierFolder === folderName ? 'rgba(64, 201, 162, 0.2)' : 'rgba(255,255,255,0.04)',
                    color: activeDossierFolder === folderName ? 'var(--earth)' : 'var(--text)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  {folderName}
                </button>
              ))}
            </div>

            <button
              onClick={handleDownloadProfileDossierTxt}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '100px',
                background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))',
                color: '#07111f',
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(64, 201, 162, 0.25)'
              }}
              title="Download dossier folder as .txt"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download {activeDossierFolder} as .txt
            </button>
          </div>

          {filteredRichTextPosts.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', background: 'var(--panel)', borderRadius: '20px' }}>
              No rich text dossiers in folder &quot;{activeDossierFolder}&quot;.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {filteredRichTextPosts.map((post: any) => (
                <div
                  key={post.id}
                  onClick={() => setActivePostForModal({ ...post, author: user })}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'var(--panel)',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '140px',
                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--earth)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--earth)', padding: '2px 8px', borderRadius: '100px', background: 'rgba(64, 201, 162, 0.15)', border: '1px solid rgba(64, 201, 162, 0.3)' }}>
                        {getPostFolder(post)}
                      </span>
                      {isCurrentUser && (
                        <div onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
                          <button
                            onClick={() => setMovingPostId(movingPostId === post.id ? null : post.id)}
                            style={{ padding: '2px 8px', borderRadius: '100px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--line)', color: 'var(--text)', fontSize: '0.68rem', cursor: 'pointer' }}
                          >
                            Move ▾
                          </button>
                          {movingPostId === post.id && (
                            <div style={{ position: 'absolute', top: '110%', right: 0, background: '#0c1829', border: '1px solid var(--earth)', borderRadius: '10px', padding: '6px', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                              {['General', 'Research', 'Logs', 'Ideas', 'Personal'].map(fn => (
                                <button
                                  key={fn}
                                  onClick={() => handleMoveProfileFolder(post.id, fn)}
                                  style={{ textAlign: 'left', padding: '5px 8px', borderRadius: '6px', background: getPostFolder(post) === fn ? 'rgba(64, 201, 162, 0.2)' : 'transparent', border: 'none', color: getPostFolder(post) === fn ? 'var(--earth)' : 'var(--text)', fontSize: '0.74rem', cursor: 'pointer' }}
                                >
                                  {fn}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.content}
                    </p>
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--muted)' }}>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span>♥ {post.likes?.length || 0} · 💬 {post.reelComments?.length || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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

            {/* UI Scaling Selector */}
            <div style={{ padding: '16px 20px', background: 'var(--panel-solid)', borderRadius: '16px', border: '1px solid var(--line)' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', fontWeight: 700 }}>
                App Display Scaling
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleUiScaleChange('compact')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: uiScale === 'compact' ? '2px solid var(--earth)' : '1px solid var(--line)',
                    background: uiScale === 'compact' ? 'rgba(64, 201, 162, 0.12)' : 'rgba(0,0,0,0.2)',
                    color: uiScale === 'compact' ? 'var(--earth)' : 'var(--text)',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    textAlign: 'center'
                  }}
                >
                  <span>Compact Native</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 400 }}>Sleek, 15% compact scale</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUiScaleChange('standard')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: uiScale === 'standard' ? '2px solid var(--earth)' : '1px solid var(--line)',
                    background: uiScale === 'standard' ? 'rgba(64, 201, 162, 0.12)' : 'rgba(0,0,0,0.2)',
                    color: uiScale === 'standard' ? 'var(--earth)' : 'var(--text)',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    textAlign: 'center'
                  }}
                >
                  <span>Standard</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 400 }}>Full standard font size</span>
                </button>
              </div>
            </div>

            {/* Storage & Cache Management */}
            <div style={{ padding: '16px 20px', background: 'var(--panel-solid)', borderRadius: '16px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Device Storage & Media Cache
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--earth)', fontWeight: 600 }}>
                  Active (LRU Auto-Purge)
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                Orbit dynamically purges stale video and image buffers from device RAM to prevent memory bloat and keep performance snappy.
              </p>
              <button
                type="button"
                onClick={() => {
                  try {
                    const keys = Object.keys(localStorage);
                    keys.forEach(k => {
                      if (k.startsWith('orbit_cache_') || k.startsWith('media_temp_')) {
                        localStorage.removeItem(k);
                      }
                    });
                    if ('caches' in window) {
                      caches.keys().then(names => names.forEach(n => caches.delete(n)));
                    }
                    alert('Local media buffers and offline cache purged successfully! 🧹');
                  } catch (e) {
                    alert('Cache cleared.');
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '100px',
                  border: '1px solid var(--line)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Purge Temporary Cache & Buffers
              </button>
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

      {/* ───────── Irreversible Delete Account Confirmation Modal ───────── */}
      {showDeleteModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => {
            if (!isDeleting) {
              setShowDeleteModal(false);
              setDeleteConfirmText('');
            }
          }}
        >
          <div 
            style={{
              background: 'var(--panel-solid)',
              border: '1px solid var(--danger)',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', color: 'var(--danger)', fontWeight: 700 }}>
              Permanently Delete Account?
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '18px' }}>
              This will irreversibly delete your profile, all uploaded transmissions, media files, comments, likes, private saves, chat messages, and follower links.
            </p>
            <div style={{ marginBottom: '18px', textAlign: 'left' }}>
              <label style={{ display: 'block', color: 'var(--text)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>
                Type <span style={{ color: 'var(--danger)', fontWeight: 700 }}>DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={isDeleting}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--line)',
                  background: 'rgba(0,0,0,0.25)',
                  color: 'var(--text)',
                  outline: 'none',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  letterSpacing: '0.1em',
                  fontWeight: 700
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '100px',
                  border: '1px solid var(--line)',
                  background: 'transparent',
                  color: 'var(--text)',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const res = await deleteAccount();
                    if (res?.success) {
                      window.location.href = '/auth/register';
                    } else {
                      alert(res?.error || 'Failed to delete account.');
                      setIsDeleting(false);
                    }
                  } catch (e: any) {
                    alert('Error deleting account: ' + e?.message);
                    setIsDeleting(false);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '100px',
                  border: 'none',
                  background: deleteConfirmText === 'DELETE' ? 'var(--danger)' : 'rgba(184, 92, 92, 0.35)',
                  color: 'white',
                  cursor: deleteConfirmText === 'DELETE' && !isDeleting ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                {isDeleting ? 'Purging Account...' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
