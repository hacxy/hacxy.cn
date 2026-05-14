import { useState, useEffect } from "react";
import { NavLink } from "react-router";
import classNames from "classnames";
import styles from "./index.module.scss";

interface SidebarItemData {
  text: string;
  link?: string;
  items?: SidebarItemData[];
}

let hasAnimated = false;

function SidebarGroup({ item, currentPath, onNavigate }: { item: SidebarItemData; currentPath: string; onNavigate?: () => void }) {
  if (item.items && item.items.length > 0) {
    return (
      <div className={styles.group}>
        <p className={styles.groupTitle}>{item.text}</p>
        <ul className={styles.list}>
          {item.items.map((child, i) => (
            <li key={child.link ?? i}>
              <SidebarGroup item={child} currentPath={currentPath} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (item.link) {
    return (
      <NavLink
        to={item.link}
        className={classNames(styles.link, {
          [styles.active]: currentPath === item.link,
        })}
        onClick={onNavigate}
      >
        {item.text}
      </NavLink>
    );
  }

  return <span className={styles.groupTitle}>{item.text}</span>;
}

export default function Sidebar({ items, currentPath, onNavigate }: { items: SidebarItemData[]; currentPath: string; onNavigate?: () => void }) {
  const [shouldAnimate] = useState(() => !hasAnimated);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (shouldAnimate) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTriggered(true);
          hasAnimated = true;
        });
      });
    }
  }, [shouldAnimate]);

  if (!items || items.length === 0) return null;

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {items.map((item, i) => (
          <div
            key={item.link ?? i}
            style={
              shouldAnimate
                ? { opacity: triggered ? 1 : 0, transition: `opacity 0.3s ease-out ${i * 0.08}s` }
                : undefined
            }
          >
            <SidebarGroup item={item} currentPath={currentPath} onNavigate={onNavigate} />
          </div>
        ))}
      </nav>
    </aside>
  );
}
