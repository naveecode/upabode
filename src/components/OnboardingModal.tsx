'use client';

import { useState } from 'react';
import { completeOnboarding, skipOnboarding } from '../app/actions';
import { useUploadThing } from './UploadButton';
import { compressImage, validateMediaType } from '../lib/mediaCompressor';
import { showToast } from './Toast';

interface OnboardingModalProps {
  currentUser: any;
}

export default function OnboardingModal({ currentUser }: OnboardingModalProps) {
  const [handle, setHandle] = useState(currentUser?.handle?.replace(/^@/, '') || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(!currentUser?.onboarded);

  const { startUpload } = useUploadThing("mediaUploader");

  if (!isOpen) return null;

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateMediaType(file);
    if (!validation.valid || validation.type !== 'image') {
      showToast(validation.error || 'Please select a valid photo.');
      return;
    }

    setIsUploadingAvatar(true);
    showToast('Optimizing avatar...');
    try {
      const compressed = await compressImage(file, { cropSquare: true, maxWidth: 600, maxHeight: 600, quality: 0.88 });
      const res = await startUpload([compressed]);
      if (res && res[0]) {
        setAvatarUrl(res[0].url);
        showToast('Profile picture attached!');
      }
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = handle.trim().toLowerCase().replace(/^@/, '');
    if (cleanHandle.length < 3) {
      showToast('User ID must be at least 3 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('handle', cleanHandle);
      if (avatarUrl) formData.append('avatarUrl', avatarUrl);

      const res = await completeOnboarding(formData);
      if (res?.error) {
        showToast(res.error);
        setIsSubmitting(false);
      } else {
        showToast('Profile setup complete! Welcome to Orbit.');
        setIsOpen(false);
        window.location.reload();
      }
    } catch (err: any) {
      showToast(`Setup failed: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  const handleLater = async () => {
    setIsSubmitting(true);
    try {
      await skipOnboarding();
      showToast('Welcome to Multigram! You can update your profile anytime.');
      setIsOpen(false);
      window.location.reload();
    } catch {
      setIsOpen(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 8, 18, 0.92)',
      backdropFilter: 'blur(18px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
    }}>
      <div style={{
        background: 'var(--panel)',
        width: '100%',
        maxWidth: '440px',
        borderRadius: '28px',
        padding: '32px 28px',
        border: '1.5px solid var(--line)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(64, 201, 162, 0.15)',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Glow Header Accent */}
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--earth), var(--yellow))',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(64, 201, 162, 0.35)',
          color: '#07111f'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>

        <h2 style={{
          color: 'var(--text)',
          fontSize: '1.4rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: '6px',
          fontFamily: 'var(--font-heading)'
        }}>
          Personalize Your Orbit
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.86rem', margin: '0 0 24px 0', lineHeight: 1.4 }}>
          Choose your unique User ID and set an avatar. You can change these anytime or skip to start exploring right away.
        </p>

        {/* Profile Picture Section */}
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            position: 'relative',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            padding: '3px',
            background: 'linear-gradient(135deg, var(--earth), rgba(244, 201, 93, 0.5))',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#0d1e34',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {avatarUrl && avatarUrl.startsWith('http') ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--earth)' }}>
                  {currentUser?.username?.charAt(0).toUpperCase() || '✦'}
                </span>
              )}
            </div>

            {/* Camera badge to change photo */}
            <label
              title="Upload Profile Picture"
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--earth)',
                color: '#07111f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isUploadingAvatar ? 'wait' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                transition: 'transform 0.2s ease'
              }}
            >
              <input
                type="file"
                accept="image/*"
                disabled={isUploadingAvatar}
                style={{ display: 'none' }}
                onChange={handleAvatarSelect}
              />
              {isUploadingAvatar ? (
                <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </label>
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--earth)', marginTop: '8px', fontWeight: 600 }}>
            {avatarUrl ? 'Photo attached' : 'Tap camera icon to upload photo'}
          </span>
        </div>

        {/* User ID Form */}
        <form onSubmit={handleSave}>
          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', fontWeight: 600 }}>
              Unique User ID
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1.5px solid var(--line)',
              borderRadius: '12px',
              padding: '0 14px',
              transition: 'border-color 0.2s ease'
            }}>
              <span style={{ color: 'var(--earth)', fontWeight: 700, fontSize: '1rem', marginRight: '4px' }}>@</span>
              <input
                type="text"
                value={handle}
                onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="your_handle"
                required
                maxLength={30}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  padding: '12px 0',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
              Your public handle on transmissions and chat (letters, numbers, underscore)
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingAvatar || handle.trim().length < 3}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '100px',
                background: (isSubmitting || isUploadingAvatar || handle.trim().length < 3) ? 'var(--line)' : 'var(--earth)',
                color: '#07111f',
                fontWeight: 700,
                fontSize: '0.92rem',
                border: 'none',
                cursor: (isSubmitting || isUploadingAvatar || handle.trim().length < 3) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(64, 201, 162, 0.3)'
              }}
            >
              {isSubmitting ? 'Saving Profile...' : 'Save & Continue'}
            </button>

            <button
              type="button"
              onClick={handleLater}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '100px',
                background: 'transparent',
                color: 'var(--muted)',
                fontWeight: 600,
                fontSize: '0.88rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => {
                e.currentTarget.style.color = 'var(--text)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.color = 'var(--muted)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              Later (Skip for now)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
