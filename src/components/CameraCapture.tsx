'use client';

import React, { useRef, useState, useEffect } from 'react';
import { showToast } from './Toast';

export default function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void, onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [filter, setFilter] = useState('none');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const filters = [
    { name: 'Normal', value: 'none' },
    { name: 'Glamour', value: 'contrast(1.1) brightness(1.1) saturate(1.2)' },
    { name: 'Ultra Beauty', value: 'contrast(1.05) brightness(1.15) saturate(1.3) blur(0.5px)' },
    { name: 'Cosmic', value: 'sepia(0.3) hue-rotate(-30deg) saturate(1.4)' },
    { name: 'Mars', value: 'sepia(0.6) hue-rotate(-15deg) saturate(1.5) contrast(1.1)' },
    { name: 'Void', value: 'grayscale(1) contrast(1.2)' },
    { name: 'Neon', value: 'saturate(2) hue-rotate(90deg) contrast(1.5)' },
    { name: 'Vintage', value: 'sepia(0.5) contrast(1.2) brightness(0.9) saturate(0.8)' },
    { name: 'Cinematic', value: 'contrast(1.2) saturate(1.1) brightness(0.9)' }
  ];

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
        ctx.filter = filter;
        if (facingMode === 'user') {
          // Mirror the canvas for selfie cam
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Reset transform to draw normally if we added overlays
        if (facingMode === 'user') {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
          }
        }, 'image/jpeg', 0.9);
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
            filter,
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
          }} 
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Top bar */}
        <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer', backdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <button onClick={toggleCamera} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '44px', height: '44px', cursor: 'pointer', backdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16v-2a4 4 0 0 0-4-4H7"/><polygon points="11 14 7 10 11 6"/><path d="M3 8v2a4 4 0 0 0 4 4h10"/><polygon points="13 18 17 22 13 26"/></svg>
          </button>
        </div>
      </div>

      {/* Filter Selector */}
      <div style={{ height: '80px', display: 'flex', alignItems: 'center', overflowX: 'auto', gap: '10px', padding: '0 20px', background: 'rgba(20,20,20,0.9)', scrollbarWidth: 'none' }}>
        {filters.map(f => (
          <button 
            key={f.name}
            onClick={() => setFilter(f.value)}
            style={{ 
              padding: '8px 16px', borderRadius: '100px', border: '2px solid',
              borderColor: filter === f.value ? 'var(--earth)' : 'transparent',
              background: filter === f.value ? 'rgba(197, 160, 89, 0.2)' : 'rgba(255,255,255,0.1)', 
              color: 'white', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.3s ease'
            }}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Capture Controls */}
      <div style={{ height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(10,10,10,0.95)' }}>
        <button 
          onClick={takePhoto}
          style={{ 
            width: '76px', height: '76px', borderRadius: '50%', border: '4px solid white', 
            background: 'var(--earth)', cursor: 'pointer', boxShadow: '0 0 20px rgba(197, 160, 89, 0.4)'
          }} 
        />
      </div>
    </div>
  );
}
