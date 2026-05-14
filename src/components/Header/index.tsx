import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { NavLink } from "react-router";
import { Icon } from "@iconify/react";
import classNames from "classnames";
import blogConfig from "virtual:blog-config";
import styles from "./index.module.scss";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > 0);
  const headerRef = useRef<HTMLElement>(null);

  const updateHeaderHeight = useCallback(() => {
    if (headerRef.current) {
      document.documentElement.style.setProperty(
        "--header-height",
        `${headerRef.current.offsetHeight}px`
      );
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    updateHeaderHeight();
  }, [updateHeaderHeight]);

  useEffect(() => {
    window.addEventListener("resize", updateHeaderHeight);
    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, [updateHeaderHeight]);

  return (
    <header ref={headerRef} className={classNames(styles.headerEl, { [styles.scrolled]: scrolled })}>
      <div className={styles.header}>
        <NavLink to="/" className={styles.logo} aria-label="Home">
          <div className={styles.logoIcon}>
            {blogConfig.logo && typeof blogConfig.logo === "object" ? (
              <img src={blogConfig.logo.src} alt={blogConfig.logo.alt ?? "logo"} width={28} height={28} />
            ) : (
              <Icon icon={(blogConfig.logo as string) ?? "simple-icons:hackster"} width={28} height={28} />
            )}
          </div>
          <span className={styles.logoName}>{blogConfig.author.toLowerCase()}</span>
          <span className={styles.logoCursor}>_</span>
        </NavLink>
        <nav className={styles.nav}>
          {(blogConfig.nav ?? []).map((item) => {
            const isExternal = /^https?:\/\//.test(item.link);
            const content = (
              <>
                {item.icon && <Icon icon={item.icon} width={18} height={18} />}
                {item.text && <span>{item.text}</span>}
              </>
            );
            return isExternal ? (
              <a
                key={item.link}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className={item.icon && !item.text ? styles.navIconLink : styles.navLink}
                aria-label={item.text ?? item.icon}
              >
                {content}
              </a>
            ) : (
              <NavLink
                key={item.link}
                to={item.link}
                className={({ isActive }) =>
                  classNames(styles.navLink, { [styles.active]: isActive })
                }
              >
                {content}
              </NavLink>
            );
          })}
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
