import { useEffect, useRef } from "react";
import styles from "./index.module.scss";

const LOG_LINES = [
  "$ git commit -m 'feat: add new post'",
  "$ pnpm run build",
  "✓ built in 1.23s",
  "$ git push origin main",
  "> vite build v5.0.0",
  "dist/index.html  0.54 kB",
  "dist/assets/index.js  142 kB",
  "$ ls -la src/",
  "drwxr-xr-x  components/",
  "drwxr-xr-x  pages/",
  "-rw-r--r--  App.tsx",
  "-rw-r--r--  main.tsx",
  "$ git log --oneline -5",
  "e72b370 chore: update config",
  "8b845b0 feat: refactor blog",
  "$ pnpm add classnames",
  "added 1 package in 0.8s",
  "$ node --version",
  "v20.11.0",
  "$ cat package.json",
  '"name": "hacxy.cn"',
  '"type": "module"',
  "$ vite --version",
  "vite/5.0.0",
  "$ tsc --noEmit",
  "✓ no errors found",
  "$ git status",
  "nothing to commit",
  "$ uptime",
  "up 42 days, 3:27",
];

interface Column {
  x: number;
  yOffset: number;
  speed: number;
  lines: string[];
}

function createColumns(width: number, height: number): Column[] {
  const colWidth = 240;
  const count = Math.ceil(width / colWidth);
  return Array.from({ length: count }, (_, i) => {
    const shuffled = [...LOG_LINES].sort(() => Math.random() - 0.5);
    return {
      x: i * colWidth + 10,
      yOffset: Math.random() * height,
      speed: 0.3 + Math.random() * 0.4,
      lines: shuffled.slice(0, 20),
    };
  });
}

export default function CodeStreamBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const LINE_HEIGHT = 20;
    let columns: Column[] = [];
    let rafId: number;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      columns = createColumns(window.innerWidth, window.innerHeight);
    }

    function draw() {
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      const color = isDark
        ? "rgba(255, 255, 255, 0.07)"
        : "rgba(0, 0, 0, 0.05)";
      const h = canvas!.height;

      ctx!.clearRect(0, 0, canvas!.width, h);
      ctx!.font = `11px "DM Mono", "Fira Code", monospace`;
      ctx!.fillStyle = color;

      for (const col of columns) {
        col.yOffset += col.speed;

        const total = col.lines.length * LINE_HEIGHT;
        const startLineIdx =
          Math.floor(col.yOffset / LINE_HEIGHT) % col.lines.length;
        const partial = col.yOffset % LINE_HEIGHT;
        const visibleCount = Math.ceil(h / LINE_HEIGHT) + 2;

        for (let i = 0; i < visibleCount; i++) {
          const lineIdx =
            (startLineIdx + i + col.lines.length) % col.lines.length;
          const y = i * LINE_HEIGHT - partial;
          if (y > h + LINE_HEIGHT) break;
          ctx!.fillText(col.lines[lineIdx], col.x, y + LINE_HEIGHT);
        }

        // reset offset to prevent float overflow over long sessions
        if (col.yOffset > total * 1000) col.yOffset -= total * 1000;
      }

      rafId = requestAnimationFrame(draw);
    }

    resize();
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
  );
}
