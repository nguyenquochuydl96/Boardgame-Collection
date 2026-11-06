import React from 'react';

export interface AnimatedNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  thousandSeparator?: string;
}

/**
 * High-performance, zero-overhead number display with native tabular-nums.
 * Eliminates CPU-heavy sliding loops on mobile devices.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className = '',
  prefix = '',
  suffix = '',
  thousandSeparator = ',',
}) => {
  const rounded = Math.round(value);
  const formatted = thousandSeparator === '.'
    ? rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : rounded.toLocaleString('en-US');

  return (
    <span className={`inline-flex items-center font-mono tabular-nums tracking-tight ${className}`}>
      {prefix && <span>{prefix}</span>}
      <span>{formatted}</span>
      {suffix && <span>{suffix}</span>}
    </span>
  );
};

export default AnimatedNumber;
