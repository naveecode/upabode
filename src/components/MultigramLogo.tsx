'use client';

import React from 'react';

interface MultigramLogoProps {
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  animated?: boolean;
}

export default function MultigramLogo({
  size = 40,
  color = 'currentColor',
  className = '',
  style = {},
  animated = false,
}: MultigramLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        overflow: 'visible',
        color: color,
        ...style,
      }}
    >
      {/* Orbital Arc Track */}
      <path
        d="M 26 78 C 14 54, 30 24, 66 18 C 102 12, 114 42, 108 70 C 102 96, 74 110, 46 106 C 28 103, 18 90, 24 76"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="4 3"
        opacity={0.45}
        style={animated ? { animation: 'orbitDash 12s linear infinite' } : undefined}
      />

      {/* Orbit beads */}
      <circle cx="100" cy="34" r="2.5" fill="currentColor" opacity={0.7} />
      <circle cx="92" cy="98" r="2" fill="currentColor" opacity={0.7} />

      {/* Focus Bracket Reticle (Top-Left) */}
      <g opacity={0.85} stroke="currentColor" strokeWidth="1.5">
        <path d="M 20 28 H 25" />
        <path d="M 20 28 V 33" />
        <path d="M 34 28 H 29" />
        <path d="M 34 28 V 33" />
        <path d="M 20 42 H 25" />
        <path d="M 20 42 V 37" />
        <path d="M 34 42 H 29" />
        <path d="M 34 42 V 37" />
        <circle cx="27" cy="35" r="1.3" fill="currentColor" stroke="none" />
      </g>

      {/* Audio Waveform Bars (Right) */}
      <g opacity={0.85} stroke="currentColor" strokeWidth="2.2">
        <line x1="102" y1="59" x2="102" y2="67" />
        <line x1="106" y1="54" x2="106" y2="72" />
        <line x1="110" y1="49" x2="110" y2="77" />
        <line x1="114" y1="55" x2="114" y2="71" />
      </g>

      {/* 4-Point Star (Bottom-Left) */}
      <path
        d="M 26 84 Q 26 90 20 90 Q 26 90 26 96 Q 26 90 32 90 Q 26 90 26 84 Z"
        fill="currentColor"
        opacity={0.9}
      />

      {/* Cute right arm bubble */}
      <circle cx="90" cy="74" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" />

      {/* Main Mascot Fluid Silhouette */}
      <path
        d="M 46 44 C 46 32, 54 22, 66 22 C 78 22, 86 32, 86 44 C 86 52, 80 58, 82 66 C 84 74, 82 86, 72 94 C 62 102, 46 100, 40 90 C 34 80, 36 66, 44 58 C 46 54, 46 48, 46 44 Z"
        stroke="currentColor"
        strokeWidth="2.8"
        fill="currentColor"
        fillOpacity={0.08}
      />

      {/* Mascot Face: Cute Eyes & Smile */}
      <circle cx="58" cy="39" r="3.5" fill="currentColor" />
      <circle cx="74" cy="39" r="3.5" fill="currentColor" />
      <path d="M 63 45 Q 66 49.5 69 45 Z" fill="currentColor" />

      {/* Camera Lens Assembly */}
      {/* Outer Bezel */}
      <circle cx="63" cy="74" r="20" stroke="currentColor" strokeWidth="2.8" fill="none" />
      <circle cx="63" cy="74" r="17.5" stroke="currentColor" strokeWidth="1.2" opacity={0.5} />
      
      {/* Inner Lens Housing */}
      <circle
        cx="63"
        cy="74"
        r="13.5"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity={0.12}
      />

      {/* Aperture Blades Accent Lines */}
      <g opacity={0.45} stroke="currentColor" strokeWidth="1.2">
        <line x1="63" y1="60.5" x2="71" y2="68" />
        <line x1="76.5" y1="74" x2="69" y2="82" />
        <line x1="63" y1="87.5" x2="55" y2="80" />
        <line x1="49.5" y1="74" x2="57" y2="66" />
      </g>

      {/* Deep Aperture Pupil */}
      <circle cx="63" cy="74" r="6.5" fill="currentColor" />
      {/* Lens Flare Glint */}
      <circle cx="65.5" cy="71.5" r="1.8" fill="currentColor" opacity={0.35} />
    </svg>
  );
}
