import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import styles from "./index.module.scss";

interface AISummaryProps {
  text: string;
}

export default function AISummary({ text }: AISummaryProps) {
  const [started, setStarted] = useState(false);
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!started) return;
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
  }, [started, text]);

  if (!text) return null;

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.header} ${started ? styles.headerBordered : ""}`}>
        <div className={styles.headerLeft}>
          <Icon icon="simple-icons:anthropic" width={13} height={13} />
          <span>AI 摘要</span>
        </div>
        {!started && (
          <button className={styles.generateBtn} onClick={() => setStarted(true)}>
            <Icon icon="lucide:sparkles" width={13} height={13} />
            生成摘要
          </button>
        )}
      </div>
      {started && (
        <p className={styles.body}>
          {displayed}
          {!done && <span className={styles.cursor} />}
        </p>
      )}
    </div>
  );
}
