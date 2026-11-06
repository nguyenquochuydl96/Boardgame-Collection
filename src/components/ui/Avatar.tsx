import React, { useState, memo } from 'react';
import { cn } from './cn';
import { resolveAvatarImage, getSafeDisplayAvatar } from '../../lib/utils';

export interface AvatarProps {
  name: string;
  avatar?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const AvatarComponent: React.FC<AvatarProps> = ({
  name,
  avatar,
  color = 'var(--accent-primary)',
  size = 'md',
  className,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizes: Record<NonNullable<AvatarProps['size']>, string> = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-2xl',
    xl: 'w-20 h-20 text-4xl',
  };

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const imageSrc = resolveAvatarImage(avatar);

  return (
    <div
      style={{
        backgroundColor: `${color}28`,
        borderColor: `${color}80`,
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-full border-2 font-bold text-white shrink-0 select-none overflow-hidden relative',
        sizes[size],
        className
      )}
      title={name}
    >
      {imageSrc && !imageError ? (
        <img
          src={imageSrc}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="truncate max-w-full px-0.5">{getSafeDisplayAvatar(avatar, initials || '?')}</span>
      )}
    </div>
  );
};

export const Avatar = memo(AvatarComponent);
export default Avatar;
