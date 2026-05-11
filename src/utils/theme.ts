export function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const THEME_COLORS = {
  light: "#f5f5f2",
  dark: "#111111",
};

let transitionTimer: ReturnType<typeof setTimeout> | undefined;

export function applyTheme(theme: "light" | "dark"): void {
  const html = document.documentElement;
  clearTimeout(transitionTimer);
  html.classList.add("theme-transitioning");
  html.setAttribute("data-theme", theme);

  // color-scheme 告诉 Safari 以哪种模式渲染系统 UI（安全区域背景）
  html.style.colorScheme = theme;

  // 直接写入 html 的 background-color，确保 Safari 安全区域立即同步
  html.style.backgroundColor = THEME_COLORS[theme];

  // 同步更新 theme-color meta
  const metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (metaThemeColor) metaThemeColor.content = THEME_COLORS[theme];

  transitionTimer = setTimeout(() => html.classList.remove("theme-transitioning"), 200);
}
