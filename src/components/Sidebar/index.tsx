import { NavLink } from "react-router";
import { motion } from "motion/react";
import classNames from "classnames";
import styles from "./index.module.scss";

interface SidebarItemData {
  text: string;
  link?: string;
  items?: SidebarItemData[];
}

function SidebarGroup({ item, currentPath, onNavigate, delay }: { item: SidebarItemData; currentPath: string; onNavigate?: () => void; delay: number }) {
  if (item.items && item.items.length > 0) {
    return (
      <motion.div
        className={styles.group}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay }}
      >
        <p className={styles.groupTitle}>{item.text}</p>
        <ul className={styles.list}>
          {item.items.map((child, i) => (
            <li key={child.link ?? i}>
              <SidebarGroup item={child} currentPath={currentPath} onNavigate={onNavigate} delay={delay + (i + 1) * 0.04} />
            </li>
          ))}
        </ul>
      </motion.div>
    );
  }

  if (item.link) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, delay }}
      >
        <NavLink
          to={item.link}
          className={classNames(styles.link, {
            [styles.active]: currentPath === item.link,
          })}
          onClick={onNavigate}
        >
          {item.text}
        </NavLink>
      </motion.div>
    );
  }

  return <span className={styles.groupTitle}>{item.text}</span>;
}

export default function Sidebar({ items, currentPath, onNavigate }: { items: SidebarItemData[]; currentPath: string; onNavigate?: () => void }) {
  if (!items || items.length === 0) return null;

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {items.map((item, i) => (
          <SidebarGroup key={item.link ?? i} item={item} currentPath={currentPath} onNavigate={onNavigate} delay={i * 0.06} />
        ))}
      </nav>
    </aside>
  );
}
