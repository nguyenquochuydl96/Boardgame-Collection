import React from 'react';
import { cn } from './cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-xl bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] animate-pulse',
        className
      )}
      {...props}
    />
  );
};

export default Skeleton;
