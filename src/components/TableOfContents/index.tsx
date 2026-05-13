import { useState, useEffect } from "react";
import { motion } from "motion/react";
import type { TocItem } from "../../utils/headings";
import styles from "./index.module.scss";

export default function TableOfContents({ headings, onNavigate }: { headings: TocItem[]; onNavigate?: () => void }) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "0px 0px -80% 0px", threshold: 0 }
    );

    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <aside className={styles.toc}>
      <motion.p
        className={styles.title}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        目录
      </motion.p>
      <ul className={styles.list}>
        {headings.map((heading, i) => (
          <motion.li
            key={heading.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: (i + 1) * 0.04 }}
          >
            <a
              href={`#${heading.id}`}
              className={`${styles.link} ${activeId === heading.id ? styles.active : ""}`}
              style={{ paddingLeft: `${(heading.level - minLevel) * 0.75 + 0.5}rem` }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth" });
                onNavigate?.();
              }}
            >
              {heading.text}
            </a>
          </motion.li>
        ))}
      </ul>
    </aside>
  );
}
