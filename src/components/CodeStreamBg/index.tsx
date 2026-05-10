import { useEffect, useRef } from "react";
import styles from "./index.module.scss";

const h16 = (n: number, len: number) => n.toString(16).padStart(len, "0");

function buildHexLine(addr: number): string {
  const bytes = Array.from({ length: 8 }, () => (Math.random() * 256) | 0);
  const hex   = bytes.map((b) => h16(b, 2)).join(" ");
  const ascii = bytes.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("");
  return `0x${h16(addr, 8)}: ${hex}  |${ascii}|`;
}

interface Column {
  x:          number;
  y:          number;
  spd:        number;
  lines:      string[];
  LH:         number;
  flash:      { idx: number; age: number; maxAge: number };
  flashTimer: number;
}

function createColumns(width: number, height: number): Column[] {
  const CW = 380;
  const n  = Math.ceil(width / CW) + 1;
  return Array.from({ length: n }, (_, i) => ({
    x:          i * CW + (i % 2 === 0 ? 0 : 40),
    y:          -(Math.random() * height),
    spd:        0.18 + Math.random() * 0.22,
    lines:      Array.from({ length: 64 }, (__, j) => buildHexLine(j * 8 + i * 0x400)),
    LH:         18,
    flash:      { idx: -1, age: 0, maxAge: 0 },
    flashTimer: Math.random() * 200,
  }));
}

export default function CodeStreamBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let columns: Column[] = [];
    let rafId:   number;

    function resize() {
      canvas!.width  = window.innerWidth;
      canvas!.height = window.innerHeight;
      columns = createColumns(window.innerWidth, window.innerHeight);
    }

    function draw() {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const color  = isDark ? "#00e5a0" : "#1a1a1a";
      const base   = isDark ? 0.11 : 0.048;
      const h      = canvas!.height;

      ctx!.clearRect(0, 0, canvas!.width, h);
      ctx!.font      = '10.5px "JetBrains Mono","Fira Code",monospace';
      ctx!.fillStyle = color;

      for (const c of columns) {
        c.y += c.spd;
        c.flashTimer--;

        if (c.flashTimer <= 0) {
          c.flashTimer   = 160 + Math.random() * 240;
          c.flash.idx    = (Math.random() * c.lines.length) | 0;
          c.flash.age    = 0;
          c.flash.maxAge = 50 + Math.random() * 30;
        }
        c.flash.age++;

        const total = c.lines.length * c.LH;
        if (c.y > h + 40) c.y -= total;

        const vis   = Math.ceil(h / c.LH) + 2;
        const start = Math.max(0, -Math.floor(c.y / c.LH));

        for (let i = start; i < start + vis; i++) {
          const li = i % c.lines.length;
          const y  = c.y + i * c.LH;
          if (y < -c.LH || y > h + 4) continue;

          const isFlash = li === c.flash.idx && c.flash.age < c.flash.maxAge;

          if (isFlash) {
            const t = 1 - c.flash.age / c.flash.maxAge;
            ctx!.globalAlpha = t * (isDark ? 0.75 : 0.38);
          } else {
            ctx!.globalAlpha = base;
          }

          ctx!.fillText(c.lines[li], c.x, y);
        }
      }

      ctx!.globalAlpha = 1;
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

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
