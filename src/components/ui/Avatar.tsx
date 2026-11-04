import React from 'react';
import { cn } from './cn';

export interface AvatarProps {
  name: string;
  avatar?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatar,
  color = '#7c3aed',
  size = 'md',
  className,
}) => {
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

  const isUrl = avatar && (avatar.startsWith('http') || avatar.startsWith('data:'));

  return (
    <div
      style={{
        backgroundColor: `${color}28`,
        borderColor: `${color}80`,
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-full border-2 font-bold text-white shrink-0 select-none overflow-hidden',
        sizes[size],
        className
      )}
      title={name}
    >
      {isUrl ? (
        <img
          src={avatar}
          alt={name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{avatar || initials || '?'}</span>
      )}
    </div>
  );
};

export default Avatar;
