import React from 'react';
import { Player } from '../../types';
import { Avatar, AvatarProps } from '../ui/Avatar';

export interface PlayerAvatarProps extends Omit<AvatarProps, 'name' | 'avatar' | 'color'> {
  player?: Player;
  name?: string;
  avatar?: string;
  color?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  name,
  avatar,
  color,
  size = 'md',
  className,
}) => {
  const resolvedName = player?.name || name || 'Player';
  const resolvedAvatar = player?.avatar || avatar;
  const resolvedColor = player?.color || color || '#7c3aed';

  return (
    <Avatar
      name={resolvedName}
      avatar={resolvedAvatar}
      color={resolvedColor}
      size={size}
      className={className}
    />
  );
};

export default PlayerAvatar;
