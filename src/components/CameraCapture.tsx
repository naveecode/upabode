'use client';

import React, { useRef, useState, useEffect } from 'react';
import { showToast } from './Toast';

interface BeautyPreset {
  id: string;
  name: string;
  icon: string;
  value: string;
  category: 'cosmetic' | 'glow' | 'artistic';
}

const BEAUTY_PRESETS: BeautyPreset[] = [
  { id: 'normal', name: 'Original', icon: '📷', value: 'none', category: 'artistic' },
  { id: 'fair_skin', name: 'Fair Skin', icon: '🌸', value: 'brightness(1.18) contrast(0.96) saturate(1.08) sepia(0.03)', category: 'cosmetic' },
  { id: 'rosy_lips', name: 'Rosy Lips', icon: '💋', value: 'saturate(1.42) contrast(1.1) brightness(1.06) hue-rotate(-8deg)', category: 'cosmetic' },
  { id: 'slender_face', name: 'Slender V-Shape', icon: '📐', value: 'contrast(1.12) brightness(1.06) saturate(1.15)', category: 'cosmetic' },
  { id: 'glowing_skin', name: 'Glowing Skin', icon: '✨', value: 'brightness(1.2) contrast(1.06) saturate(1.22)', category: 'glow' },
  { id: 'glass_skin', name: 'Glass Skin', icon: '💎', value: 'brightness(1.14) contrast(1.04) saturate(1.1) blur(0.3px)', category: 'glow' },
  { id: 'golden_hour', name: 'Golden Hour', icon: '☀️', value: 'sepia(0.24) saturate(1.35) brightness(1.08) contrast(1.06)', category: 'glow' },
  { id: 'porcelain', name: 'Porcelain Smooth', icon: '🪞', value: 'brightness(1.12) contrast(0.94) saturate(1.04) blur(0.4px)', category: 'cosmetic' },
  { id: 'glamour', name: 'Glamour Chic', icon: '💄', value: 'contrast(1.12) brightness(1.12) saturate(1.25)', category: 'cosmetic' },
  { id: 'cyberpunk', name: 'Cyber Neon', icon: '⚡', value: 'saturate(2) hue-rotate(85deg) contrast(1.35)', category: 'artistic' },
  { id: 'noir', name: 'Cosmic Noir', icon: '🌌', value: 'grayscale(1) contrast(1.3) brightness(1.05)', category: 'artistic' },
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
