import React from 'react';

interface AvatarImageProps {
  index: number; // 0 to 14
  className?: string;
  style?: React.CSSProperties;
}

export const AVATARS_DATA = [
  { name: 'Phantom', col: 0, row: 0 },
  { name: 'Thorium', col: 1, row: 0 },
  { name: 'Xeuss', col: 2, row: 0 },
  { name: 'Titanium', col: 3, row: 0 },
  { name: 'Vortex', col: 4, row: 0 },
  { name: 'Nebula', col: 0, row: 1 },
  { name: 'Aurora', col: 1, row: 1 },
  { name: 'Pulsar', col: 2, row: 1 },
  { name: 'Quasar', col: 3, row: 1 },
  { name: 'Zenith', col: 4, row: 1 },
  { name: 'Spectre', col: 0, row: 2 },
  { name: 'Krypton', col: 1, row: 2 },
  { name: 'Chronos', col: 2, row: 2 },
  { name: 'Nexus', col: 3, row: 2 },
  { name: 'Apex', col: 4, row: 2 },
];

export default function AvatarImage({ index, className = 'w-full h-full', style }: AvatarImageProps) {
  const avatar = AVATARS_DATA[index] ?? AVATARS_DATA[0];
  const { col, row } = avatar;

  // Render the specific avatar from the spritesheet
  // We use w-[500%] and h-[300%] to divide the image into 5x3 cells.
  // We apply scale-[1.3] to zoom in and crop out transparent margins.
  return (
    <div className={`relative overflow-hidden shrink-0 select-none ${className}`} style={style}>
      <img
        src="/Avatar/Avatar.png"
        alt={avatar.name}
        className="absolute max-w-none w-[500%] h-[300%] scale-[1.3] origin-center"
        style={{
          left: `-${col * 100}%`,
          top: `-${row * 100}%`,
        }}
      />
    </div>
  );
}
