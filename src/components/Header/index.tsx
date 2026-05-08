import { NavLink } from "react-router";
import { Icon } from "@iconify/react";
import classNames from "classnames";
import siteConfig from "../../../site.config";
import styles from "./index.module.scss";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header>
      <div className={styles.header}>
        <NavLink to="/" className={styles.logo} aria-label="Home">
          <div className={styles.logoIcon}>
            <Icon icon="simple-icons:hackster" width={32} height={32} style={{ color: "var(--fg)" }} />
          </div>
        </NavLink>
        <nav className={styles.nav}>
          <NavLink
            to="/posts"
            className={({ isActive }) =>
              classNames(styles.navLink, { [styles.active]: isActive })
            }
          >
            Blog
          </NavLink>
          <NavLink
            to="/tags"
            className={({ isActive }) =>
              classNames(styles.navLink, { [styles.active]: isActive })
            }
          >
            Tags
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              classNames(styles.navLink, { [styles.active]: isActive })
            }
          >
            About
          </NavLink>
          <a
            href={`https://github.com/${siteConfig.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.navIconLink}
            aria-label="GitHub"
          >
            <Icon icon="lucide:github" width={18} height={18} />
          </a>
          <button
            className={styles.themeToggle}
            onClick={onToggleTheme}
            aria-label={
              theme === "dark" ? "切换到浅色模式" : "切换到深色模式"
            }
          >
            <Icon
              icon={theme === "dark" ? "lucide:sun" : "lucide:moon"}
              width={18}
              height={18}
            />
          </button>
        </nav>
      </div>
    </header>
  );
}
