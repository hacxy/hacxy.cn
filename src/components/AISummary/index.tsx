import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import styles from "./index.module.scss";

interface AISummaryProps {
  text: string;
}

export default function AISummary({ text }: AISummaryProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        setDone(true);
        clearInterval(timer);
      }
    }, 18);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Icon icon="simple-icons:anthropic" width={13} height={13} />
        <span>AI 摘要</span>
      </div>
      <p className={styles.body}>
        {displayed}
        {!done && <span className={styles.cursor} />}
      </p>
    </div>
  );
}
