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
          'rounded-2xl bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line)] shadow-sm transition-all duration-200 ease-out',
          glow && 'shadow-[inset_0_0_0_1px_var(--border-glow)] shadow-md shadow-[var(--accent-glow)]',
          interactive &&
            'hover:shadow-[inset_0_0_0_1px_var(--line-2)] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
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
