import React from 'react';

interface GeekGridLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const GeekGridLogo: React.FC<GeekGridLogoProps> = ({
  size = 'md',
  showText = true,
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', textTitle: 'text-base' },
    md: { box: 'w-8 h-8', textTitle: 'text-lg' },
    lg: { box: 'w-11 h-11', textTitle: 'text-2xl' },
    xl: { box: 'w-14 h-14', textTitle: 'text-3xl' },
  };

  const current = sizeMap[size];

  return (
    <div className="inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0">
      <div className={`relative ${current.box} shrink-0`}>
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-hidden="true"
        >
          <rect
            width="36"
            height="36"
            rx="8"
            style={{ fill: 'var(--gg-logo-box)', stroke: 'var(--gg-logo-stroke)' }}
            strokeWidth="1.5"
          />
          <rect x="7" y="7" width="9" height="9" rx="2" fill="#F59E0B" />
          <rect x="20" y="7" width="9" height="9" rx="2" style={{ stroke: 'var(--gg-logo-ink)' }} strokeWidth="2" />
          <rect x="7" y="20" width="9" height="9" rx="2" style={{ stroke: 'var(--gg-logo-ink)' }} strokeWidth="2" />
          <rect x="20" y="20" width="9" height="9" rx="2" style={{ fill: 'var(--gg-logo-ink)' }} />
        </svg>
      </div>

      {showText && (
        <span
          className={`font-display font-bold tracking-tight text-[var(--gg-text-strong)] whitespace-nowrap ${current.textTitle}`}
        >
          Geek <span className="text-[var(--gg-accent-text)]">Grid</span>
        </span>
      )}
    </div>
  );
};

export const HQMasterLogo = GeekGridLogo;
