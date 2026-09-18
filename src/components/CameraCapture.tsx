'use client';

import React, { useRef, useState, useEffect } from 'react';
import { showToast } from './Toast';

interface BeautyPreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  value: string;
  category: 'cosmetic' | 'glow' | 'artistic';
}

const BEAUTY_PRESETS: BeautyPreset[] = [
  {
    id: 'normal',
    name: 'Original',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
        <circle cx="12" cy="13" r="3"/>
      </svg>
    ),
    value: 'none',
    category: 'artistic'
  },
  {
    id: 'fair_skin',
    name: 'Fair Skin',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2a4 4 0 0 0-4 4c0 3 4 6 4 6s4-3 4-6a4 4 0 0 0-4-4z"/>
        <path d="M12 22a4 4 0 0 0 4-4c0-3-4-6-4-6s-4 3-4 6a4 4 0 0 0 4 4z"/>
        <path d="M2 12a4 4 0 0 0 4 4c3 0 6-4 6-4s-3-4-6-4a4 4 0 0 0-4 4z"/>
        <path d="M22 12a4 4 0 0 0-4-4c-3 0-6 4-6 4s3 4 6 4a4 4 0 0 0 4-4z"/>
      </svg>
    ),
    value: 'brightness(1.18) contrast(0.96) saturate(1.08) sepia(0.03)',
    category: 'cosmetic'
  },
  {
    id: 'rosy_lips',
    name: 'Rosy Lips',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    value: 'saturate(1.42) contrast(1.1) brightness(1.06) hue-rotate(-8deg)',
    category: 'cosmetic'
  },
  {
    id: 'slender_face',
    name: 'Slender V-Shape',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 22 2 5 22 5 12 22"/>
      </svg>
    ),
    value: 'contrast(1.12) brightness(1.06) saturate(1.15)',
    category: 'cosmetic'
  },
  {
    id: 'glowing_skin',
    name: 'Glowing Skin',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 7.2L21.6 12l-7.2 2.8L12 22l-2.4-7.2L2.4 12l7.2-2.8L12 2z"/>
      </svg>
    ),
    value: 'brightness(1.2) contrast(1.06) saturate(1.22)',
    category: 'glow'
  },
  {
    id: 'glass_skin',
    name: 'Glass Skin',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l4 7-10 11L2 10l4-7z"/>
      </svg>
    ),
    value: 'brightness(1.14) contrast(1.04) saturate(1.1) blur(0.3px)',
    category: 'glow'
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41"/>
      </svg>
    ),
    value: 'sepia(0.24) saturate(1.35) brightness(1.08) contrast(1.06)',
    category: 'glow'
  },
  {
    id: 'porcelain',
    name: 'Porcelain Smooth',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 3v18M3 12h18"/>
      </svg>
    ),
    value: 'brightness(1.12) contrast(0.94) saturate(1.04) blur(0.4px)',
    category: 'cosmetic'
  },
  {
    id: 'glamour',
    name: 'Glamour Chic',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 4 5 5-11 11H4v-5l11-11z"/>
        <path d="m13 6 5 5"/>
      </svg>
    ),
    value: 'contrast(1.12) brightness(1.12) saturate(1.25)',
    category: 'cosmetic'
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Neon',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    value: 'saturate(2) hue-rotate(85deg) contrast(1.35)',
    category: 'artistic'
  },
  {
    id: 'noir',
    name: 'Cosmic Noir',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    ),
    value: 'grayscale(1) contrast(1.3) brightness(1.05)',
    category: 'artistic'
  },
];

export default function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void, onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<BeautyPreset>(BEAUTY_PRESETS[1]); // Default to Fair Skin
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    async function startCamera() {
      try {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        setStream(mediaStream);
        currentStream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        showToast("Camera access denied or unavailable");
        onClose();
      }
    }
    startCamera();
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = selectedPreset.value;
        if (facingMode === 'user') {
          // Mirror the canvas for selfie cam
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Reset transform to draw overlays
        if (facingMode === 'user') {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Additional cosmetic contouring pass for Slender Face
        if (selectedPreset.id === 'slender_face') {
          const contourGrad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height * 0.45, canvas.width * 0.32,
            canvas.width / 2, canvas.height * 0.45, canvas.width * 0.72
          );
          contourGrad.addColorStop(0, 'rgba(0,0,0,0)');
          contourGrad.addColorStop(0.75, 'rgba(0,0,0,0)');
          contourGrad.addColorStop(1, 'rgba(0,0,0,0.32)');
          ctx.fillStyle = contourGrad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Soft luminescence pass for Glowing / Glass skin
        if (selectedPreset.id === 'glowing_skin' || selectedPreset.id === 'glass_skin') {
          const glowGrad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height * 0.4, canvas.width * 0.1,
            canvas.width / 2, canvas.height * 0.4, canvas.width * 0.6
          );
          glowGrad.addColorStop(0, 'rgba(255, 235, 210, 0.08)');
          glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glowGrad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
          }
        }, 'image/jpeg', 0.92);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            filter: selectedPreset.value,
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
          }} 
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Optical Slender Face Silhouette Guide */}
        {selectedPreset.id === 'slender_face' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse 65% 85% at 50% 45%, transparent 62%, rgba(0,0,0,0.32) 100%)'
          }} />
        )}

        {/* Optical Glass / Glowing Specular Halo */}
        {(selectedPreset.id === 'glowing_skin' || selectedPreset.id === 'glass_skin') && (
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(circle at 50% 40%, rgba(255,230,200,0.12) 0%, transparent 65%)'
          }} />
        )}

        {/* High-Tech Optical Viewfinder Graphic while opening camera sensor */}
        {!stream && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 45%, #0e1e33 0%, #07111f 70%, #030810 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 15,
            padding: '20px'
          }}>
            <div style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px dashed var(--earth)',
                animation: 'cameraSpin 8s linear infinite',
                opacity: 0.7
              }} />
              <div style={{
                position: 'absolute',
                inset: '12px',
                borderRadius: '50%',
                border: '1.5px solid rgba(64, 201, 162, 0.4)',
                boxShadow: '0 0 25px rgba(64, 201, 162, 0.25)'
              }} />
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #1e3a5f 0%, #0d1e34 70%, #061120 100%)',
                border: '2px solid var(--earth)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
              }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--earth)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>

            <span style={{
              color: 'var(--earth)',
              fontSize: '0.92rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '6px'
            }}>
              Calibrating Optical Sensor...
            </span>
            <span style={{
              color: 'rgba(255, 255, 255, 0.55)',
              fontSize: '0.78rem'
            }}>
              Upabode Orbit Live Viewfinder
            </span>
            <style>{`
              @keyframes cameraSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
        
        {/* Top bar controls */}
        <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 }}>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '50%', width: '42px', height: '42px', cursor: 'pointer', backdropFilter: 'blur(12px)', display: 'grid', placeItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Active Preset Indicator Pill */}
          <div style={{
            background: 'rgba(7, 17, 31, 0.75)',
            border: '1px solid var(--earth)',
            padding: '6px 16px',
            borderRadius: '100px',
            color: 'var(--text)',
            fontSize: '0.82rem',
            fontWeight: 700,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>{selectedPreset.icon}</span>
            <span>{selectedPreset.name}</span>
          </div>

          <button onClick={toggleCamera} style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '50%', width: '42px', height: '42px', cursor: 'pointer', backdropFilter: 'blur(12px)', display: 'grid', placeItems: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16v-2a4 4 0 0 0-4-4H7"/><polygon points="11 14 7 10 11 6"/><path d="M3 8v2a4 4 0 0 0 4 4h10"/><polygon points="13 18 17 22 13 26"/></svg>
          </button>
        </div>
      </div>

      {/* Cosmetic & Beauty Filter Selector Carousel */}
      <div style={{
        height: '84px',
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        gap: '10px',
        padding: '0 20px',
        background: 'rgba(10, 15, 25, 0.95)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        scrollbarWidth: 'none'
      }}>
        {BEAUTY_PRESETS.map(preset => {
          const isSelected = selectedPreset.id === preset.id;
          return (
            <button 
              key={preset.id}
              onClick={() => setSelectedPreset(preset)}
              style={{ 
                padding: '8px 16px',
                borderRadius: '100px',
                border: isSelected ? '1.5px solid var(--earth)' : '1px solid rgba(255,255,255,0.12)',
                background: isSelected ? 'rgba(64, 201, 162, 0.22)' : 'rgba(255,255,255,0.06)', 
                color: isSelected ? 'var(--earth)' : 'white',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                flexShrink: 0,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                boxShadow: isSelected ? '0 0 16px rgba(64, 201, 162, 0.35)' : 'none'
              }}
            >
              <span>{preset.icon}</span>
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>

      {/* Shutter Capture Controls */}
      <div style={{ height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#050a12', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button 
          onClick={takePhoto}
          style={{ 
            width: '74px', height: '74px', borderRadius: '50%', border: '4px solid white', 
            background: 'linear-gradient(135deg, var(--earth), var(--earth-dark))', cursor: 'pointer',
            boxShadow: '0 0 25px rgba(64, 201, 162, 0.45)',
            display: 'grid',
            placeItems: 'center',
            transition: 'transform 0.15s ease'
          }} 
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onTouchStart={e => e.currentTarget.style.transform = 'scale(0.92)'}
          onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
        />
      </div>
    </div>
  );
}
