'use client';

import React, { useRef, useState, useEffect } from 'react';
import { showToast } from './Toast';

export default function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void, onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [filter, setFilter] = useState('none');

  const filters = [
    { name: 'Normal', value: 'none' },
    { name: 'Cosmic', value: 'sepia(0.3) hue-rotate(-30deg) saturate(1.4)' },
    { name: 'Mars', value: 'sepia(0.6) hue-rotate(-15deg) saturate(1.5) contrast(1.1)' },
    { name: 'Void', value: 'grayscale(1) contrast(1.2)' },
    { name: 'Neon', value: 'saturate(2) hue-rotate(90deg) contrast(1.5)' }
  ];

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
        setStream(mediaStream);
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
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = filter;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], \capture-\.jpg\, { type: 'image/jpeg' });
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
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter }} 
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Top bar */}
        <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>×</button>
        </div>
      </div>

      {/* Filter Selector */}
      <div style={{ height: '80px', display: 'flex', alignItems: 'center', overflowX: 'auto', gap: '10px', padding: '0 20px', background: 'rgba(20,20,20,0.9)' }}>
        {filters.map(f => (
          <button 
            key={f.name}
            onClick={() => setFilter(f.value)}
            style={{ 
              padding: '8px 16px', borderRadius: '100px', border: '2px solid',
              borderColor: filter === f.value ? 'var(--earth)' : 'transparent',
              background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, cursor: 'pointer', flexShrink: 0 
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
