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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.08, ease: 'easeOut' }}
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
