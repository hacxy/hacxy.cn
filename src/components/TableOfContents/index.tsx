import { useState, useEffect, useRef } from "react";
import type { TocItem } from "../../utils/headings";
import styles from "./index.module.scss";

export default function TableOfContents({ headings, onNavigate }: { headings: TocItem[]; onNavigate?: () => void }) {
  const [activeId, setActiveId] = useState("");
  const tocRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    function updateActive() {
      const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-height") || "0", 10);
      const threshold = headerHeight + 32;

      let current = "";
      for (const { id } of headings) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= threshold) {
          current = id;
        }
      }
      setActiveId(current);
    }

    const raf = requestAnimationFrame(updateActive);
    window.addEventListener("scroll", updateActive, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", updateActive);
    };
  }, [headings]);

  useEffect(() => {
    if (!activeId || !tocRef.current) return;
    const container = tocRef.current;
    const activeEl = container.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId)}"]`);
    if (!activeEl) return;
    const elTop = activeEl.offsetTop - container.offsetTop;
    const elBottom = elTop + activeEl.offsetHeight;
    if (elTop < container.scrollTop) {
      container.scrollTo({ top: elTop - 8, behavior: "smooth" });
    } else if (elBottom > container.scrollTop + container.clientHeight) {
      container.scrollTo({ top: elBottom - container.clientHeight + 8, behavior: "smooth" });
    }
  }, [activeId]);

  if (headings.length === 0) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <aside className={styles.toc} ref={tocRef}>
      <p className={styles.title} style={{ animation: "sidebar-fade-in 0.3s both" }}>
        目录
      </p>
      <ul className={styles.list}>
        {headings.map((heading, i) => (
          <li
            key={heading.id}
            style={{ animation: `sidebar-fade-in 0.25s ${(i + 1) * 0.04}s both` }}
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
          </li>
        ))}
      </ul>
    </aside>
  );
}
