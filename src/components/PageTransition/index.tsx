import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const SESSION_KEY = "__blog_navigated__";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const shouldReduce = useReducedMotion();
  const [isFirst] = useState(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    sessionStorage.setItem(SESSION_KEY, "1");
    return true;
  });

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
