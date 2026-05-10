import { NavLink } from "react-router";
import classNames from "classnames";
import blogConfig from "virtual:blog-config";
import styles from "./index.module.scss";

interface SidebarItemData {
  text: string;
  link?: string;
  items?: SidebarItemData[];
}

function SidebarGroup({ item, currentPath }: { item: SidebarItemData; currentPath: string }) {
  if (item.items && item.items.length > 0) {
    return (
      <div className={styles.group}>
        <p className={styles.groupTitle}>{item.text}</p>
        <ul className={styles.list}>
          {item.items.map((child, i) => (
            <li key={child.link ?? i}>
              <SidebarGroup item={child} currentPath={currentPath} />
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
      >
        {item.text}
      </NavLink>
    );
  }

  return <span className={styles.groupTitle}>{item.text}</span>;
}

export default function Sidebar({ currentPath }: { currentPath: string }) {
  const sidebar = blogConfig.sidebar;
  if (!sidebar || sidebar.length === 0) return null;

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {sidebar.map((item, i) => (
          <SidebarGroup key={item.link ?? i} item={item} currentPath={currentPath} />
        ))}
      </nav>
    </aside>
  );
}
