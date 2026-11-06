import React from 'react';
import { cn } from '../ui/cn';

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('w-full animate-in fade-in duration-100 fill-mode-forwards', className)}>
      {children}
    </div>
  );
};

export default PageTransition;
