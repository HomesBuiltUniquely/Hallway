'use client';

import React, { useMemo } from 'react';

interface LivingRoomSceneProps {
  isDark?: boolean;
}

export const LivingRoomScene: React.FC<LivingRoomSceneProps> = ({ isDark = false }) => {
  // Generate perspective floor plank lines from -40 to 1100 with step 70
  const plankPaths = useMemo(() => {
    const paths: string[] = [];
    for (let x = -40; x < 1100; x += 70) {
      paths.push(`M${x} 400L${x - 60} 560`);
    }
    return paths;
  }, []);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-700 select-none"
      viewBox="0 0 1000 560"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        {/* Light Mode Sunbeam Gradient */}
        <linearGradient id="beam-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.32" />
          <stop offset="35%" stopColor="#fef3c7" stopOpacity="0.18" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Day Sky Gradient inside Window */}
        <linearGradient id="sky-day" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="50%" stopColor="#bae6fd" />
          <stop offset="85%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#fed7aa" />
        </linearGradient>

        {/* Sun Outer Glow */}
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#fde047" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>

        {/* Sun Core Disc */}
        <radialGradient id="sun-core" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="40%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>

        {/* Dark Mode Moonbeam / Ambient Gradient */}
        <linearGradient id="beam-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.20" />
          <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>

        {/* Ambient Wall Light Gradient (Dark Mode) */}
        <radialGradient id="night-ambient" cx="20%" cy="25%" r="65%">
          <stop offset="0%" stopColor="#e8201c" stopOpacity="0.12" />
          <stop offset="60%" stopColor="#0b0f19" stopOpacity="0.0" />
        </radialGradient>

        {/* Floor Gradient */}
        <linearGradient id="floor-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dcbc9c" />
          <stop offset="100%" stopColor="#cfab88" />
        </linearGradient>
        <linearGradient id="floor-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1410" />
          <stop offset="100%" stopColor="#120d0a" />
        </linearGradient>

        {/* Center Gallery Depth Vignette */}
        <radialGradient id="center-vignette-light" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="center-vignette-dark" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. Back Wall Ambient Fill */}
      <rect
        width="1000"
        height="400"
        fill={isDark ? '#090d15' : '#f3e6dd'}
        className="transition-colors duration-700"
      />
      {isDark && (
        <rect
          width="1000"
          height="400"
          fill="url(#night-ambient)"
          className="transition-opacity duration-700"
        />
      )}

      {/* 2. Floor */}
      <rect
        y="400"
        width="1000"
        height="160"
        fill={isDark ? 'url(#floor-dark)' : 'url(#floor-light)'}
        className="transition-colors duration-700"
      />

      {/* Perspective Floor Planks */}
      <g stroke={isDark ? '#2e2219' : '#b78e6a'} strokeOpacity={isDark ? '0.45' : '0.35'} strokeWidth="1.5">
        {plankPaths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* Baseboard Molding */}
      <rect
        y="392"
        width="1000"
        height="10"
        fill={isDark ? '#1a2232' : '#ffffff'}
        fillOpacity={isDark ? 0.85 : 0.7}
        className="transition-colors duration-700"
      />

      {/* 3. Window & Outside View (Shifted slightly outward left to open up center space) */}
      <rect
        x="40"
        y="60"
        width="145"
        height="230"
        rx="4"
        fill={isDark ? '#0f172a' : 'url(#sky-day)'}
        stroke={isDark ? '#334155' : '#ded2c5'}
        strokeWidth="8"
        className="transition-colors duration-700"
      />

      {/* Day Sky Details inside Window (Light Mode only - Clouds & Garden Foliage) */}
      {!isDark && (
        <g className="transition-opacity duration-700">
          {/* Drifting Architectural Clouds across Window Panes */}
          <path
            d="M55 125 a 8 8 0 0 1 14 -3 a 12 12 0 0 1 20 1 a 7 7 0 0 1 12 3 h -46 z"
            fill="#ffffff"
            opacity="0.85"
          />
          <path
            d="M120 90 a 8 8 0 0 1 15 -3 a 13 13 0 0 1 20 1 a 7 7 0 0 1 12 3 h -47 z"
            fill="#ffffff"
            opacity="0.8"
          />
          <path
            d="M95 152 a 6 6 0 0 1 10 -2 a 9 9 0 0 1 15 1 a 5 5 0 0 1 9 2 h -34 z"
            fill="#ffffff"
            opacity="0.65"
          />

          {/* Landscaped Garden Foliage Silhouette at bottom of window */}
          <path
            d="M40 278 Q65 248 90 268 Q115 248 145 266 Q165 250 185 272 L185 290 L40 290 Z"
            fill="#86a788"
            opacity="0.75"
          />
          <path
            d="M40 285 Q70 260 105 282 Q135 262 185 280 L185 290 L40 290 Z"
            fill="#4d7254"
            opacity="0.85"
          />
        </g>
      )}

      {/* Night Sky Details inside Window (Dark Mode only) */}
      {isDark && (
        <g opacity="0.85" className="transition-opacity duration-700">
          {/* Crescent Moon */}
          <path
            d="M148 85 a 12 12 0 1 0 16 16 a 10 10 0 1 1 -16 -16 Z"
            fill="#fef08a"
            opacity="0.9"
          />
          {/* Twinkling Stars */}
          <circle cx="70" cy="95" r="1.5" fill="#ffffff" opacity="0.8" />
          <circle cx="95" cy="80" r="1.2" fill="#ffffff" opacity="0.6" />
          <circle cx="120" cy="115" r="1.5" fill="#ffffff" opacity="0.75" />
          <circle cx="65" cy="140" r="1" fill="#ffffff" opacity="0.5" />
          <circle cx="155" cy="135" r="1.2" fill="#ffffff" opacity="0.7" />
        </g>
      )}

      {/* Window Mullions / Grids */}
      <path
        d="M112 60v230M40 175h145"
        stroke={isDark ? '#334155' : '#ded2c5'}
        strokeWidth="5"
        className="transition-colors duration-700"
      />

      {/* Volumetric Light Beam Cast from Window across the Room */}
      <polygon
        points="40,290 185,290 380,560 -110,560"
        fill={isDark ? 'url(#beam-dark)' : 'url(#beam-light)'}
        className="transition-all duration-700"
      />

      {/* 4. Gallery Art Wall Frames (Shifted cleanly to the top-right quadrant) */}
      {/* Frame 1: HUB Crimson Accent */}
      <rect
        x="740"
        y="65"
        width="80"
        height="115"
        rx="2"
        fill="#e8201c"
        fillOpacity={isDark ? 0.5 : 0.35}
        stroke={isDark ? '#1e293b' : '#ffffff'}
        strokeWidth="6"
        className="transition-colors duration-700"
      />

      {/* Frame 2: Warm Terracotta */}
      <rect
        x="835"
        y="65"
        width="135"
        height="75"
        rx="2"
        fill="#ffab7a"
        fillOpacity={isDark ? 0.45 : 0.5}
        stroke={isDark ? '#1e293b' : '#ffffff'}
        strokeWidth="6"
        className="transition-colors duration-700"
      />

      {/* Frame 3: Sage Green */}
      <rect
        x="835"
        y="155"
        width="135"
        height="65"
        rx="2"
        fill="#8fa98f"
        fillOpacity={isDark ? 0.4 : 0.45}
        stroke={isDark ? '#1e293b' : '#ffffff'}
        strokeWidth="6"
        className="transition-colors duration-700"
      />

      {/* 5. Minimalist Designer Sofa / Lounge (Shifted right to x=750 so card has open clearing) */}
      <g className="transition-all duration-700">
        {/* Sofa Backrest */}
        <rect
          x="750"
          y="310"
          width="235"
          height="90"
          rx="16"
          fill={isDark ? '#1b2432' : '#7d8f84'}
          className="transition-colors duration-700"
        />

        {/* Left Armrest */}
        <rect
          x="736"
          y="335"
          width="38"
          height="80"
          rx="14"
          fill={isDark ? '#151d28' : '#6c7e73'}
          className="transition-colors duration-700"
        />

        {/* Right Armrest */}
        <rect
          x="957"
          y="335"
          width="38"
          height="80"
          rx="14"
          fill={isDark ? '#151d28' : '#6c7e73'}
          className="transition-colors duration-700"
        />

        {/* Seat Cushion */}
        <rect
          x="774"
          y="352"
          width="183"
          height="50"
          rx="10"
          fill={isDark ? '#222e3e' : '#8ea196'}
          className="transition-colors duration-700"
        />

        {/* HUB Red Accent Throw Pillow */}
        <rect
          x="795"
          y="340"
          width="40"
          height="40"
          rx="8"
          fill="#e8201c"
          fillOpacity={isDark ? 0.9 : 0.8}
        />

        {/* Wooden Legs */}
        <path
          d="M765 415v14M960 415v14"
          stroke={isDark ? '#3d2516' : '#7a4a2a'}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>

      {/* 6. Indoor Potted Snake Plant (Left corner) */}
      <g className="transition-all duration-700">
        {/* Terracotta Planter Pot */}
        <path
          d="M50 470h46l-8 70H58z"
          fill={isDark ? '#823725' : '#c4604a'}
          className="transition-colors duration-700"
        />

        {/* Foliage Leaves */}
        <path
          d="M73 470C40 430 50 390 73 360 96 390 106 430 73 470M73 470C25 450 18 410 28 385M73 470C120 450 126 410 118 385"
          fill={isDark ? '#386348' : '#6f9a74'}
          className="transition-colors duration-700"
        />
      </g>

      {/* 7. Subtle Center Gallery Ambient Glow */}
      <rect
        width="1000"
        height="560"
        fill={isDark ? 'url(#center-vignette-dark)' : 'url(#center-vignette-light)'}
        className="transition-opacity duration-700 pointer-events-none"
      />
    </svg>
  );
};
