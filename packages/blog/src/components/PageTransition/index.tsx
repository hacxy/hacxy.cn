import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const shouldReduce = useReducedMotion();
  const isFirst = useRef(true);
  const skipInitial = isFirst.current;
  isFirst.current = false;

  const variants = {
    initial: { opacity: skipInitial ? 1 : 0, y: skipInitial || shouldReduce ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: shouldReduce ? 0 : -8 },
  };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
