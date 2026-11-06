import React, { memo } from 'react';
import { Player } from '../../types';
import { Avatar, AvatarProps } from '../ui/Avatar';
import { getDeterministicAvatar } from '../../lib/boardgameAvatars';

export interface PlayerAvatarProps extends Omit<AvatarProps, 'name' | 'avatar' | 'color'> {
  player?: Player;
  name?: string;
  avatar?: string;
  color?: string;
}

const PlayerAvatarComponent: React.FC<PlayerAvatarProps> = ({
  player,
  name,
  avatar,
  color,
  size = 'md',
  className,
}) => {
  const resolvedName = player?.name || name || 'Player';
  const defaultBg = getDeterministicAvatar(resolvedName);
  const resolvedAvatar = player?.avatar || avatar || defaultBg.emoji;
  const resolvedColor = player?.color || color || defaultBg.color;

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

export const PlayerAvatar = memo(PlayerAvatarComponent);
export default PlayerAvatar;
