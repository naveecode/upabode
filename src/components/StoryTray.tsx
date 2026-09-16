'use client';

import { useState, useEffect } from 'react';
import { getFeedStories, markStoryViewed, createStory } from '../app/actions';
import { UploadButton } from './UploadButton';

interface Story {
  id: string;
  mediaUrl: string | null;
  content: string | null;
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
  const [isUploadingStatus, setIsUploadingStatus] = useState(false);

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
            display: 'grid', placeItems: 'center', fontSize: '1.5rem', color: 'var(--earth)',
            transition: '0.2s ease'
          }}>
            +
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
                {group.author.avatarUrl || group.author.username.charAt(0).toUpperCase()}
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

      {activeAuthorIndex !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: '#030812', zIndex: 1000,
          display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', gap: '4px', padding: '16px 16px 8px 16px', zIndex: 10 }}>
            {groupedStories[activeAuthorIndex].stories.map((s, idx) => (
              <div key={s.id} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: 'white',
                  width: idx < activeStoryIndex ? '100%' : idx === activeStoryIndex ? '100%' : '0%',
                  transition: idx === activeStoryIndex ? 'width 5s linear' : 'none',
                  animation: idx === activeStoryIndex ? 'progress 5s linear' : 'none'
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className={`user-avatar ${groupedStories[activeAuthorIndex].author.color}`} style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                {groupedStories[activeAuthorIndex].author.avatarUrl || groupedStories[activeAuthorIndex].author.username.charAt(0)}
              </div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>
                {groupedStories[activeAuthorIndex].author.username}
              </div>
            </div>
            <button onClick={closeViewer} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div onClick={handlePrevStory} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', zIndex: 20 }} />
            <div onClick={handleNextStory} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '70%', zIndex: 20 }} />

            {groupedStories[activeAuthorIndex].stories[activeStoryIndex].mediaUrl ? (
              groupedStories[activeAuthorIndex].stories[activeStoryIndex].mediaUrl!.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                <video
                  src={groupedStories[activeAuthorIndex].stories[activeStoryIndex].mediaUrl!}
                  autoPlay loop playsInline
                  style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                />
              ) : (
                <img
                  src={groupedStories[activeAuthorIndex].stories[activeStoryIndex].mediaUrl!}
                  alt="Story"
                  style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                />
              )
            ) : null}

            {groupedStories[activeAuthorIndex].stories[activeStoryIndex].content && (
              <div style={{
                position: 'absolute', top: '50%', left: '20px', right: '20px', transform: 'translateY(-50%)',
                textAlign: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 700,
                textShadow: '0 2px 10px rgba(0,0,0,0.5)', pointerEvents: 'none'
              }}>
                {groupedStories[activeAuthorIndex].stories[activeStoryIndex].content}
              </div>
            )}
          </div>
        </div>
      )}

      {showUploadModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--panel)', width: '100%', maxWidth: '400px', borderRadius: '24px',
            padding: '24px', border: '1px solid var(--line)', position: 'relative'
          }}>
            <button
              onClick={() => { setShowUploadModal(false); setStatusMedia(null); setStatusText(''); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer' }}
            >✕</button>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: 'white' }}>Broadcast Status</h3>
            
            {!statusMedia ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center', height: '200px', border: '2px dashed var(--line)', borderRadius: '16px' }}>
                <span style={{ color: 'var(--muted)' }}>Upload Photo or Video</span>
                <UploadButton
                  endpoint="mediaUploader"
                  onClientUploadComplete={(res: any) => {
                    if (res && res[0]) {
                      const isVid = res[0].name?.match(/\.(mp4|webm|ogg|mov)$/i) || res[0].type?.includes('video');
                      setStatusMedia(isVid ? `${res[0].url}#video` : res[0].url);
                    }
                  }}
                  onUploadError={(err: Error) => alert(`Upload Error: ${err.message}`)}
                />
              </div>
            ) : (
              <div style={{ width: '100%', aspectRatio: '9/16', background: '#000', borderRadius: '16px', overflow: 'hidden', position: 'relative', marginBottom: '16px' }}>
                {statusMedia.includes('#video') || statusMedia.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                  <video src={statusMedia} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={statusMedia} alt="Status Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <button
                  onClick={() => setStatusMedia(null)}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
                >✕</button>
              </div>
            )}

            <input
              type="text"
              placeholder="Add a caption... (optional)"
              value={statusText}
              onChange={e => setStatusText(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--line)', color: 'white', marginTop: '16px'
              }}
            />

            <button
              disabled={!statusMedia || isUploadingStatus}
              onClick={async () => {
                setIsUploadingStatus(true);
                const res = await createStory(statusMedia!, statusText);
                setIsUploadingStatus(false);
                if (res.error) alert(res.error);
                else {
                  setShowUploadModal(false);
                  setStatusMedia(null);
                  setStatusText('');
                  window.location.reload();
                }
              }}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', marginTop: '16px',
                background: (!statusMedia || isUploadingStatus) ? 'var(--line)' : 'var(--earth)',
                color: '#07111f', fontWeight: 700, border: 'none', cursor: (!statusMedia || isUploadingStatus) ? 'not-allowed' : 'pointer'
              }}
            >
              {isUploadingStatus ? 'Broadcasting...' : 'Post Status (24h)'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
