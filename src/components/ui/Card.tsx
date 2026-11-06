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
          'rounded-2xl bg-[var(--bg-card)] border border-[var(--line-2)] shadow-xs transition-all duration-300 ease-out',
          glow && 'border-[var(--accent-primary)] shadow-md shadow-[var(--accent-glow)]',
          interactive &&
            'hover:shadow-md hover:border-[var(--line-2)] hover:-translate-y-0.5 cursor-pointer active:translate-y-0 active:shadow-xs',
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
