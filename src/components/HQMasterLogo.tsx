import React from 'react';

interface HQMasterLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const HQMasterLogo: React.FC<HQMasterLogoProps> = ({
  size = 'md',
  showText = true,
}) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8', svg: 32, textTitle: 'text-base', textSub: 'text-[9px]' },
    md: { box: 'w-10 h-10 sm:w-11 sm:h-11', svg: 44, textTitle: 'text-lg sm:text-xl', textSub: 'text-[10px]' },
    lg: { box: 'w-14 h-14', svg: 56, textTitle: 'text-2xl', textSub: 'text-xs' },
    xl: { box: 'w-20 h-20', svg: 80, textTitle: 'text-3xl', textSub: 'text-sm' },
  };

  const current = sizeMap[size];

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Circular Emblem */}
      <div className={`relative ${current.box} shrink-0 group`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(245,158,11,0.25)] transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            {/* Outer Gold Gradient */}
            <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="35%" stopColor="#FDE68A" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>

            {/* Dark Metallic Inner */}
            <radialGradient id="innerShield" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#1E2330" />
              <stop offset="60%" stopColor="#0F131D" />
              <stop offset="100%" stopColor="#080A0F" />
            </radialGradient>

            {/* Bright Gold Text */}
            <linearGradient id="textGold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>

          {/* Outer Ring */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="url(#goldRing)" strokeWidth="3" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.4" />

          {/* Inner Background */}
          <circle cx="50" cy="50" r="44" fill="url(#innerShield)" />

          {/* Stylized Rays/Spokes subtle background */}
          <path d="M50 10 L50 20 M50 80 L50 90 M10 50 L20 50 M80 50 L90 50" stroke="#F59E0B" strokeWidth="1" opacity="0.25" />
          <path d="M22 22 L29 29 M71 71 L78 78 M22 78 L29 71 M71 29 L78 22" stroke="#F59E0B" strokeWidth="1" opacity="0.25" />

          {/* Golden Stars top */}
          <circle cx="50" cy="17" r="1.8" fill="#F59E0B" />
          <circle cx="42" cy="19" r="1.3" fill="#FDE68A" />
          <circle cx="58" cy="19" r="1.3" fill="#FDE68A" />

          {/* Central Monogram "HQ" */}
          <text
            x="50"
            y="52"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'Space Grotesk', 'Inter', sans-serif"
            fontWeight="900"
            fontSize="30"
            letterSpacing="-1"
            fill="url(#textGold)"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
          >
            HQ
          </text>

          {/* Ribbon / Banner Background for "MASTER" */}
          <path
            d="M 24 72 Q 50 68 76 72 L 74 81 Q 50 77 26 81 Z"
            fill="#B45309"
            stroke="#FDE68A"
            strokeWidth="0.75"
          />

          {/* Arched Text "MASTER" */}
          <text
            x="50"
            y="77.5"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'Space Grotesk', 'Inter', sans-serif"
            fontWeight="800"
            fontSize="7.5"
            letterSpacing="2"
            fill="#FFFFFF"
          >
            MASTER
          </text>
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-white font-['Space_Grotesk'] ${current.textTitle}`}>
              HQ <span className="text-amber-400">MASTER</span>
            </span>
          </div>
          <span className={`text-zinc-400 font-medium tracking-wide ${current.textSub} mt-0.5`}>
            Acervo & Coleções
          </span>
        </div>
      )}
    </div>
  );
};
