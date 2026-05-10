import { useState, useEffect } from "react";
import styles from "./index.module.scss";

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  onDone?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function Typewriter({
  text,
  speed = 50,
  delay = 0,
  onDone,
  className,
  style,
}: TypewriterProps) {
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setActive(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!active || count >= text.length) {
      if (active && count >= text.length) onDone?.();
      return;
    }
    const t = setTimeout(() => setCount((c) => c + 1), speed);
    return () => clearTimeout(t);
  }, [active, count, text, speed, onDone]);

  const done = count >= text.length;

  return (
    <span className={className} style={style}>
      {text.slice(0, count)}
      {!done && <span className={styles.cursor} aria-hidden="true" />}
    </span>
  );
}
