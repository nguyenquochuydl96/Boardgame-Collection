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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
