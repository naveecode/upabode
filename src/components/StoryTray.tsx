'use client';

import { useState, useEffect } from 'react';
import { getFeedStories, markStoryViewed, createStory } from '../app/actions';
import { useUploadThing } from './UploadButton';
import { showToast } from './Toast';
import { compressImage, validateMediaType } from '../lib/mediaCompressor';

interface Story {
  id: string;
  mediaUrl: string | null;
  content: string | null;
  musicUrl?: string | null;
  createdAt: Date;
  expiresAt: Date;
  authorId: string;
  author: any;
  views: any[];
}

export default function StoryTray({ currentUser }: { currentUser?: any }) {
  const [groupedStories, setGroupedStories] = useState<{ author: any, stories: Story[], hasUnseen: boolean }[]>([]);
  const [activeAuthorIndex, setActiveAuthorIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [statusMedia, setStatusMedia] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('');
  const [statusMusic, setStatusMusic] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const { startUpload } = useUploadThing("mediaUploader");

  const handleMediaPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    const file = files[0];

    const validation = validateMediaType(file);
    if (!validation.valid) {
      showToast(validation.error || 'Please select a valid image or video.');
      return;
    }

    setIsUploadingMedia(true);
    showToast('Optimizing & uploading status media...');
    try {
      let uploadTarget = file;
      if (validation.type === 'image') {
        uploadTarget = await compressImage(file, { maxWidth: 1080, maxHeight: 1920, quality: 0.88 });
      }
      const res = await startUpload([uploadTarget]);
      if (res && res[0]) {
        const isVid = res[0].name?.match(/\.(mp4|webm|ogg|mov)$/i) || res[0].type?.includes('video') || validation.type === 'video';
        setStatusMedia(isVid ? `${res[0].url}#video` : res[0].url);
        showToast('Status media attached!');
      }
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleMusicPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    const file = files[0];

    setIsUploadingMusic(true);
    showToast('Uploading custom soundtrack...');
    try {
      const res = await startUpload([file]);
      if (res && res[0]) {
        setStatusMusic(res[0].url);
        showToast('Soundtrack attached to status!');
      }
    } catch (err: any) {
      showToast(`Soundtrack upload failed: ${err.message}`);
    } finally {
      setIsUploadingMusic(false);
      e.target.value = '';
    }
  };

  const handlePublishStatus = async () => {
    if (!statusMedia) {
      showToast('Please select a photo or video for your status.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createStory(statusMedia, statusText, statusMusic || undefined);
      if (res.error) {
        showToast(res.error);
      } else {
        showToast('Status broadcasted to your orbit!');
        setShowUploadModal(false);
        setStatusMedia(null);
        setStatusText('');
        setStatusMusic('');
        window.location.reload();
      }
    } catch (err: any) {
      showToast(`Broadcast failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    async function fetchStories() {
      const res = await getFeedStories();
      if (res.success && res.stories) {
        const map = new Map<string, { author: any, stories: Story[], hasUnseen: boolean }>();
        
        res.stories.forEach((story: Story) => {
          if (!map.has(story.authorId)) {
            map.set(story.authorId, { author: story.author, stories: [], hasUnseen: false });
          }
          const group = map.get(story.authorId)!;
          group.stories.push(story);
          if (story.views.length === 0 && story.authorId !== currentUser?.id) {
            group.hasUnseen = true;
          }
        });
        
        const groups = Array.from(map.values());
        groups.sort((a, b) => {
          if (a.author.id === currentUser?.id) return -1;
          if (b.author.id === currentUser?.id) return 1;
          if (a.hasUnseen && !b.hasUnseen) return -1;
          if (!a.hasUnseen && b.hasUnseen) return 1;
          return 0;
        });
        
        setGroupedStories(groups);
      }
      setIsLoading(false);
    }
    fetchStories();
  }, [currentUser]);

  useEffect(() => {
    if (activeAuthorIndex === null) return;
    
    const currentGroup = groupedStories[activeAuthorIndex];
    const currentStory = currentGroup.stories[activeStoryIndex];

    if (currentStory.views.length === 0 && currentStory.authorId !== currentUser?.id) {
      markStoryViewed(currentStory.id);
      currentStory.views.push({ id: 'temp' });
    }

    const timer = setTimeout(() => {
      handleNextStory();
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeAuthorIndex, activeStoryIndex]);

  const handleNextStory = () => {
    if (activeAuthorIndex === null) return;
    const currentGroup = groupedStories[activeAuthorIndex];
    if (activeStoryIndex < currentGroup.stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else if (activeAuthorIndex < groupedStories.length - 1) {
      setActiveAuthorIndex(prev => prev! + 1);
      setActiveStoryIndex(0);
    } else {
      closeViewer();
    }
  };

  const handlePrevStory = () => {
    if (activeAuthorIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
    } else if (activeAuthorIndex > 0) {
      setActiveAuthorIndex(prev => prev! - 1);
      setActiveStoryIndex(groupedStories[activeAuthorIndex - 1].stories.length - 1);
    }
  };

  const closeViewer = () => {
    setActiveAuthorIndex(null);
    setActiveStoryIndex(0);
  };

  if (isLoading) return null;

  return (
    <>
      <div style={{
        display: 'flex',
        gap: '16px',
        overflowX: 'auto',
        padding: '0 0 20px 0',
        marginBottom: '20px',
        scrollbarWidth: 'none'
      }}>
        <div
          onClick={() => setShowUploadModal(true)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '8px', cursor: 'pointer', flexShrink: 0
          }}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', border: '2px dashed var(--earth)',
            display: 'grid', placeItems: 'center', color: 'var(--earth)',
            transition: '0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text)', fontWeight: 600 }}>
            Add Status
          </span>
        </div>

        {groupedStories.map((group, i) => (
          <div
            key={group.author.id}
            onClick={() => {
              setActiveAuthorIndex(i);
              setActiveStoryIndex(0);
            }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '8px', cursor: 'pointer', flexShrink: 0
            }}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', padding: '3px',
              background: group.hasUnseen ? 'linear-gradient(45deg, #ffb347, #ff7b00)' : 'var(--line)',
              display: 'grid', placeItems: 'center'
            }}>
              <div className={`user-avatar ${group.author.color || 'green'}`} style={{ width: '100%', height: '100%', fontSize: '1.2rem', border: '2px solid var(--bg)' }}>
                {group.author.avatarUrl?.startsWith?.('http') ? <img src={group.author.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt='avatar' /> : (group.author.avatarUrl || group.author.username.charAt(0).toUpperCase())}
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text)', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.author.id === currentUser?.id ? 'Your story' : group.author.handle}
            </span>
          </div>
        ))}
        {groupedStories.length === 0 && (
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', padding: '20px 0' }}>
            No status updates in your orbit.
          </div>
        )}
      </div>

      {/* Full-Screen Story Viewer */}
      {activeAuthorIndex !== null && currentGroup && currentStory && (
        <div style={{
          position: 'fixed', inset: 0, background: '#030812', zIndex: 1000,
          display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) ease-out'
        }}>
          {/* Progress Indicators */}
          <div style={{ display: 'flex', gap: '4px', padding: '16px 16px 8px 16px', zIndex: 10 }}>
            {currentGroup.stories.map((s, idx) => (
              <div key={s.id} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: 'white',
                  width: idx < activeStoryIndex ? '100%' : idx === activeStoryIndex ? '100%' : '0%',
                  transition: idx === activeStoryIndex ? 'width 5.5s linear' : 'none',
                  animation: idx === activeStoryIndex ? 'progress 5.5s linear' : 'none'
                }} />
              </div>
            ))}
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes progress {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          `}} />

          {/* Story Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className={`user-avatar ${currentGroup.author.color}`} style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                {currentGroup.author.avatarUrl || currentGroup.author.username.charAt(0)}
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>
                  {currentGroup.author.username}
                </div>
                {currentStory.musicUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--earth)', fontSize: '0.72rem' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    <span>Soundtrack active</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentStory.musicUrl && (
                <button
                  type="button"
                  onClick={() => setIsMuted(prev => !prev)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '100px',
                    color: isMuted ? 'var(--muted)' : 'var(--earth)',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>{isMuted ? '🔇 Muted' : '🔊 Music'}</span>
                </button>
              )}
              <button onClick={closeViewer} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
          </div>

          {/* Background Soundtrack Audio */}
          {currentStory.musicUrl && (
            <audio
              key={currentStory.id}
              src={currentStory.musicUrl}
              autoPlay
              loop
              muted={isMuted}
            />
          )}

          {/* Story Body */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div onClick={handlePrevStory} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', zIndex: 20 }} />
            <div onClick={handleNextStory} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '70%', zIndex: 20 }} />

            {currentStory.mediaUrl ? (
              currentStory.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) || currentStory.mediaUrl.includes('#video') ? (
                <video
                  src={currentStory.mediaUrl}
                  autoPlay loop playsInline
                  style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                />
              ) : (
                <img
                  src={currentStory.mediaUrl}
                  alt="Story"
                  style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                />
              )
            ) : null}

            {currentStory.content && (
              <div style={{
                position: 'absolute', bottom: '60px', left: '20px', right: '20px',
                textAlign: 'center', color: 'white', fontSize: '1.25rem', fontWeight: 700,
                textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)', pointerEvents: 'none'
              }}>
                {currentStory.content}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Broadcast Status Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{
            background: 'var(--panel)', width: '100%', maxWidth: '420px', borderRadius: '24px',
            padding: '24px', border: '1px solid var(--line)', position: 'relative',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)'
          }}>
            <button
              onClick={() => { setShowUploadModal(false); setStatusMedia(null); setStatusText(''); setStatusMusic(''); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer' }}
            >✕</button>
            
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'white', fontWeight: 800 }}>Broadcast Orbit Status</h3>
            
            {!statusMedia ? (
              <label style={{
                display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center',
                height: '200px', border: '2px dashed rgba(64, 201, 162, 0.45)', borderRadius: '18px',
                background: 'rgba(255,255,255,0.02)', cursor: isUploadingMedia ? 'wait' : 'pointer',
                transition: '0.2s ease', position: 'relative', userSelect: 'none'
              }}>
                <input
                  type="file"
                  accept="image/*,video/*"
                  disabled={isUploadingMedia}
                  style={{ display: 'none' }}
                  onChange={handleMediaPick}
                />
                {isUploadingMedia ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <svg className="spin" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--earth)" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                    </svg>
                    <span style={{ color: 'var(--earth)', fontSize: '0.9rem', fontWeight: 600 }}>Optimizing & uploading...</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Instant media streaming setup</span>
                  </div>
                ) : (
                  <>
                    <div style={{
                      width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(64, 201, 162, 0.12)',
                      display: 'grid', placeItems: 'center', color: 'var(--earth)'
                    }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.92rem' }}>Choose Photo or Video</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Select directly from device gallery</span>
                  </>
                )}
              </label>
            ) : (
              <div style={{ width: '100%', aspectRatio: '9/16', maxHeight: '280px', background: '#000', borderRadius: '16px', overflow: 'hidden', position: 'relative', marginBottom: '16px' }}>
                {statusMedia.includes('#video') || statusMedia.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                  <video src={statusMedia} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={statusMedia} alt="Status Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <button
                  onClick={() => setStatusMedia(null)}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.65)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                >✕</button>
              </div>
            )}

            {/* Caption Input */}
            <input
              type="text"
              placeholder="Add a caption... (optional)"
              value={statusText}
              onChange={e => setStatusText(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--line)', color: 'white', marginTop: '14px', fontSize: '0.88rem', outline: 'none'
              }}
            />

            {/* Soundtrack Selector & Upload */}
            <div style={{ marginTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Background Music (Optional)
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={statusMusic}
                  onChange={e => setStatusMusic(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                >
                  <option value="">No Soundtrack (Mute / Original)</option>
                  <option value="/audio/cosmic-drift.mp3">🌌 Cosmic Drift (Ambient)</option>
                  <option value="/audio/lunar-lounge.mp3">🌙 Lunar Lounge (Lo-Fi)</option>
                  <option value="/audio/nebula-beats.mp3">✨ Nebula Beats (Synthwave)</option>
                  <option value="/audio/pulsar-synth.mp3">⚡ Pulsar Synth (Electronic)</option>
                  <option value="/audio/martian-sunset.mp3">🪐 Martian Sunset (Acoustic)</option>
                  <option value="/audio/stellar-groove.mp3">🚀 Stellar Groove (Pop)</option>
                  <option value="/audio/zero-gravity.mp3">💫 Zero Gravity (Trap)</option>
                  {statusMusic && statusMusic.startsWith('http') && !statusMusic.startsWith('/audio') && (
                    <option value={statusMusic}>🎵 Custom Uploaded Audio</option>
                  )}
                </select>

                <label 
                  title="Upload custom music file"
                  style={{
                    padding: '9px 14px',
                    borderRadius: '10px',
                    background: isUploadingMusic ? 'rgba(64, 201, 162, 0.3)' : 'rgba(64, 201, 162, 0.15)',
                    border: '1px solid var(--earth)',
                    color: 'var(--earth)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: isUploadingMusic ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="file"
                    accept="audio/*"
                    disabled={isUploadingMusic}
                    style={{ display: 'none' }}
                    onChange={handleMusicPick}
                  />
                  {isUploadingMusic ? (
                    <>
                      <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" /></svg>
                      Uploading...
                    </>
                  ) : (
                    <>🎵 Upload</>
                  )}
                </label>
              </div>
              {statusMusic && (
                <div style={{ marginTop: '6px', fontSize: '0.74rem', color: 'var(--earth)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎶 Soundtrack attached</span>
                  <button 
                    type="button" 
                    onClick={() => setStatusMusic('')} 
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.74rem', textDecoration: 'underline' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              disabled={!statusMedia || isUploadingMedia || isUploadingMusic || isSubmitting}
              onClick={handlePublishStatus}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', marginTop: '18px',
                background: (!statusMedia || isUploadingMedia || isUploadingMusic || isSubmitting) ? 'var(--line)' : 'var(--earth)',
                color: '#07111f', fontWeight: 700, border: 'none',
                cursor: (!statusMedia || isUploadingMedia || isUploadingMusic || isSubmitting) ? 'not-allowed' : 'pointer',
                transition: '0.2s ease', fontSize: '0.92rem'
              }}
            >
              {isSubmitting ? 'Broadcasting Status...' : 'Post Status (24h)'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
