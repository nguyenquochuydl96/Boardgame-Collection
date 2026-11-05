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
          'rounded-xl bg-[var(--bg-card)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal)] transition-all duration-300 ease-out',
          glow && 'border-2 border-[var(--ink)] shadow-[var(--shadow-brutal-lg)]',
          interactive &&
            'hover:shadow-[var(--shadow-brutal-hover)] hover:-translate-y-1 cursor-pointer active:translate-y-0 active:shadow-[var(--shadow-brutal-sm)]',
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
