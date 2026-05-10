import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

let mountCount = 0;

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const shouldReduce = useReducedMotion();
  const [isFirst] = useState(() => mountCount++ === 0);

  const variants = {
    initial: { opacity: isFirst ? 1 : 0, y: isFirst || shouldReduce ? 0 : 8 },
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
