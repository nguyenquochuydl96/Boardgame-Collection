import React from 'react';
import { SlidingNumber } from '@animate-ui/react/primitives/texts/sliding-number';

export interface AnimatedNumberProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  thousandSeparator?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className = '',
  prefix = '',
  suffix = '',
  thousandSeparator = ',',
}) => {
  const roundedValue = Math.round(value);

  return (
    <span className={`inline-flex items-center font-mono-tabular tracking-tight ${className}`}>
      {prefix && <span>{prefix}</span>}
      <SlidingNumber
        number={roundedValue}
        thousandSeparator={thousandSeparator}
        transition={{ stiffness: 280, damping: 26, mass: 0.4 }}
      />
      {suffix && <span>{suffix}</span>}
    </span>
  );
};

export default AnimatedNumber;
