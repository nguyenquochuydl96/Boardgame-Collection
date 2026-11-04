import React from 'react';
import { cn } from './cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow = false, interactive = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl bg-[#1a1a2e]/85 backdrop-blur-md border border-white/[0.08] transition-all duration-300 ease-out',
          glow && 'border-[#7c3aed]/40 shadow-lg shadow-[#7c3aed]/10',
          interactive &&
            'hover:border-[#7c3aed]/50 hover:shadow-xl hover:shadow-[#7c3aed]/15 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
export default Card;
