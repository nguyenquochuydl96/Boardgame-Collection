import React from 'react';
import { motion } from 'motion/react';
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
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      style={{ willChange: 'opacity, transform' }}
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
