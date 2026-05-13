import { useEffect, useRef, useReducer } from "react";
import styles from "./TerminalDemo.module.scss";

interface ConvoStep {
  role: "user" | "ai";
  text: string;
}

const DEMOS: Record<string, ConvoStep[]> = {
  "code-review": [
    { role: "user", text: "> /code-review" },
    { role: "ai", text: "Scope: full project (12 files detected)" },
    { role: "ai", text: "Launching 3 review agents in parallel..." },
    { role: "ai", text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" },
    { role: "ai", text: "## Review Report\n\n🔴 Critical (1)\n  src/api/auth.ts:42 — JWT secret hardcoded\n\n🟡 Warning (3)\n  src/db/query.ts:18 — N+1 query in user loader\n  src/utils/parse.ts:7 — Unvalidated JSON.parse\n  src/routes/upload.ts:31 — No file size limit\n\n🟢 Suggestion (2)\n  src/config.ts — Extract env vars to .env\n  src/middleware/log.ts — Add request ID" },
    { role: "ai", text: "Fix critical issues now? (y/n)" },
  ],
  "create-skill": [
    { role: "user", text: "> /create-skill" },
    { role: "ai", text: "What should this skill do?" },
    { role: "user", text: "> Generate API documentation from code" },
    { role: "ai", text: "Creating skill structure..." },
    { role: "ai", text: "  📁 api-docs/\n  ├── SKILL.md (core logic)\n  ├── README.md\n  └── references/\n      ├── templates.md\n      └── examples.md" },
    { role: "ai", text: "SKILL.md written — 142 lines\nDescription field optimized for trigger accuracy.\nReady to install: npx skills add ./api-docs" },
  ],
  "fit-docs": [
    { role: "user", text: "> /fit-docs write a PRD for user auth system" },
    { role: "ai", text: "Before writing, I need to clarify a few things:" },
    { role: "ai", text: "1. Auth method: OAuth / JWT / Session?\n2. Multi-factor auth required?\n3. Target users: internal team or public?" },
    { role: "user", text: "> JWT, yes MFA, public facing" },
    { role: "ai", text: "Generating PRD...\n\n# User Authentication System — PRD\n\n## Overview\nJWT-based auth with TOTP multi-factor,\nserving public-facing applications.\n\n## Core Requirements\n- Sign up / Sign in / Password reset\n- JWT access + refresh token rotation\n- TOTP-based MFA enrollment & verify\n- Rate limiting on auth endpoints\n\n## Non-functional\n- Token expiry: 15min access / 7d refresh\n- Bcrypt cost factor: 12\n- Max 5 failed attempts → 15min lockout" },
    { role: "ai", text: "PRD saved to docs/prd-user-auth.md ✓" },
  ],
};

const DEFAULT_DEMO: ConvoStep[] = [
  { role: "user", text: "> /skill-name" },
  { role: "ai", text: "Skill activated. Ready to assist." },
  { role: "ai", text: "Analyzing project context..." },
  { role: "ai", text: "Task completed successfully ✓" },
];

interface Props {
  skillName: string;
}

export default function TerminalDemo({ skillName }: Props) {
  const steps = DEMOS[skillName] ?? DEFAULT_DEMO;
  const linesRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);
  const [replayKey, replay] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    cancelRef.current = true;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    cancelRef.current = false;
    let done = false;
    let latestTimer: ReturnType<typeof setTimeout>;

    function schedule(fn: () => void, ms: number) {
      latestTimer = setTimeout(fn, ms);
    }

    function scrollDown() {
      if (linesRef.current) linesRef.current.scrollTop = linesRef.current.scrollHeight;
    }

    function createLine(role: string): { pre: HTMLPreElement; wrapper: HTMLDivElement } {
      const wrapper = document.createElement("div");
      wrapper.className = role === "user" ? styles.lineUser : styles.lineAi;
      const pre = document.createElement("pre");
      wrapper.appendChild(pre);
      container!.appendChild(wrapper);
      return { pre, wrapper };
    }

    async function run() {
      for (let si = 0; si < steps.length; si++) {
        if (cancelRef.current) return;
        const step = steps[si];
        const speed = step.role === "user" ? 40 : 12;
        const { pre } = createLine(step.role);

        for (let ci = 0; ci <= step.text.length; ci++) {
          if (cancelRef.current) return;
          await new Promise<void>((resolve) => {
            schedule(() => {
              if (cancelRef.current) { resolve(); return; }
              pre.textContent = step.text.slice(0, ci);
              scrollDown();
              resolve();
            }, ci === 0 ? 0 : speed + Math.random() * speed * 0.5);
          });
        }

        if (cancelRef.current) return;
        await new Promise<void>((resolve) => {
          schedule(resolve, step.role === "user" ? 600 : 400);
        });
      }
      done = true;
      const btn = container!.parentElement?.querySelector(`.${styles.replayBtn}`) as HTMLElement | null;
      if (btn) btn.style.display = "flex";
    }

    const btn = container!.parentElement?.querySelector(`.${styles.replayBtn}`) as HTMLElement | null;
    if (btn) btn.style.display = "none";
    run();

    return () => {
      cancelRef.current = true;
      clearTimeout(latestTimer);
      if (!done) {
        if (btn) btn.style.display = "none";
      }
    };
  }, [skillName, steps, replayKey]);

  return (
    <div className={styles.terminal}>
      <div className={styles.terminalBar}>
        <span className={styles.dot} data-color="red" />
        <span className={styles.dot} data-color="yellow" />
        <span className={styles.dot} data-color="green" />
        <span className={styles.terminalTitle}>claude — {skillName}</span>
      </div>
      <div className={styles.terminalBody} ref={linesRef}>
        <div ref={containerRef} />
      </div>
      <button type="button" className={styles.replayBtn} onClick={replay} style={{ display: "none" }}>
        Replay
      </button>
    </div>
  );
}
