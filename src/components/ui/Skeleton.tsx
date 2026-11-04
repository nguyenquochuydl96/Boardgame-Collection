import React from 'react';
import { cn } from './cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-xl bg-[#1e1e35] animate-shimmer',
        className
      )}
      {...props}
    />
  );
};

export default Skeleton;
