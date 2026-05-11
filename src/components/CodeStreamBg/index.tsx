import { useEffect, useRef } from "react";
import styles from "./index.module.scss";

interface Convo {
  user: string;
  ai: string;
  code: string | null;
}

const CONVOS: Convo[] = [
  {
    user: "review this auth middleware",
    ai: "Found 2 issues:",
    code: "✗ JWT secret hardcoded\n✗ No rate limiting on /login",
  },
  {
    user: "add streaming to the API client",
    ai: "Using async iterators:",
    code: "for await (const chunk of stream) {\n  yield chunk.delta.text\n}",
  },
  {
    user: "why is this query slow?",
    ai: "Missing index on user_id:",
    code: "CREATE INDEX idx_posts_user\n  ON posts(user_id);",
  },
  {
    user: "build a RAG pipeline",
    ai: "Core loop:",
    code: "chunks = embed(split(docs))\nctx = search(query, chunks)\nreply = llm(ctx + query)",
  },
  {
    user: "refactor useAuth to zustand",
    ai: "3 steps:\n1. create authStore\n2. migrate useState\n3. update 6 components",
    code: null,
  },
  {
    user: "generate tests for login.ts",
    ai: "8 test cases:",
    code: 'it("rejects expired JWT", async () => {\n  await expect(verify(token))\n    .rejects.toThrow("Expired")\n})',
  },
  {
    user: "batch summarize 200 articles",
    ai: "Messages API loop:",
    code: 'for doc in docs:\n  r = client.messages.create(\n    model="claude-sonnet-4-5",\n    messages=[summarize(doc)])',
  },
  {
    user: "fix the CORS error",
    ai: "Wildcard + credentials conflict:",
    code: "Allow-Origin: https://hacxy.cn\nAllow-Credentials: true",
  },
  {
    user: "write a commit message",
    ai: "feat: add streaming handler\nwith backpressure control\nand retry on network error",
    code: null,
  },
  {
    user: "optimize this O(n²) loop",
    ai: "Use a Set for O(n):",
    code: "# before  O(n²)\nfor x in arr:\n  if x in arr2: ...\n# after   O(n)\ns = set(arr2)\nfor x in arr:\n  if x in s: ...",
  },
  {
    user: "set up pgvector search",
    ai: "Schema + index:",
    code: "ALTER TABLE docs ADD COLUMN\n  embedding vector(1536);\nCREATE INDEX ON docs\n  USING ivfflat(embedding);",
  },
  {
    user: "explain this regex",
    ai: "/^(?=.*\\d).{8,}$/\n→ 8+ chars, must have a digit",
    code: null,
  },
];

interface CardEntry {
  el: HTMLDivElement;
  x: number;
  y: number;
  vy: number;
  vx: number;
  baseOp: number;
  cancelAnim: () => void;
  col: number;
}

// escape for safe innerHTML injection (no newline conversion — we handle display separately)
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// render text with \n as <br>
function escBr(s: string): string {
  return esc(s).replace(/\n/g, "<br>");
}

/**
 * Animate a typewriter effect into `targetEl`.
 * Phase 1: type user message char-by-char with blinking cursor.
 * Phase 2: brief pause, then reveal claude row and stream ai text + code.
 * Returns a cancel function that stops all pending timers.
 */
function animateCard(
  convo: Convo,
  userTextEl: HTMLSpanElement,
  aiTextEl: HTMLSpanElement,
  codeEl: HTMLElement | null,
  cursorEl: HTMLSpanElement,
  aiRow: HTMLDivElement,
): () => void {
  const USER_SPEED = 55;   // ms per char (typing)
  const AI_SPEED   = 22;   // ms per char (streaming)
  const PAUSE      = 420;  // ms between user done → ai starts

  const timers = new Set<ReturnType<typeof setTimeout>>();

  function schedule(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  }

  // Phase 1: type user message
  let ui = 0;
  function typeUser() {
    if (ui <= convo.user.length) {
      userTextEl.innerHTML = esc(convo.user.slice(0, ui));
      ui++;
      schedule(typeUser, USER_SPEED + Math.random() * 30 - 15);
    } else {
      schedule(() => {
        userTextEl.appendChild(cursorEl.cloneNode(true) as HTMLSpanElement);
        aiRow.style.display = "flex";
        cursorEl.remove();
        aiTextEl.appendChild(cursorEl);
        let ai = 0;
        function streamAi() {
          if (ai <= convo.ai.length) {
            aiTextEl.innerHTML = escBr(convo.ai.slice(0, ai));
            aiTextEl.appendChild(cursorEl);
            ai++;
            schedule(streamAi, AI_SPEED + Math.random() * 15);
          } else {
            if (codeEl && convo.code) {
              codeEl.style.display = "block";
              let ci = 0;
              const codeText = convo.code;
              function streamCode() {
                if (ci <= codeText.length) {
                  codeEl!.textContent = codeText.slice(0, ci);
                  ci++;
                  schedule(streamCode, 14 + Math.random() * 10);
                } else {
                  cursorEl.remove();
                }
              }
              streamCode();
            } else {
              cursorEl.remove();
            }
          }
        }
        streamAi();
      }, PAUSE);
    }
  }

  schedule(typeUser, 300 + Math.random() * 400);

  return () => {
    for (const id of timers) clearTimeout(id);
    timers.clear();
  };
}

function makeCardEl(convo: Convo, s: typeof styles): { el: HTMLDivElement; cancelAnim: () => void } {
  const el = document.createElement("div");
  el.className = s.card;

  // ── user row ──────────────────────────────────────────────────────────────
  const uRow = document.createElement("div");
  uRow.className = s.cardRow;

  const uAvatar = document.createElement("div");
  uAvatar.className = `${s.avatar} ${s.avatarUser}`;
  uAvatar.textContent = "U";

  const uBubble = document.createElement("div");
  uBubble.className = `${s.bubble} ${s.userMsg}`;

  const uRole = document.createElement("div");
  uRole.className = s.role;
  uRole.textContent = "user";

  const uText = document.createElement("span");
  // starts empty — will be filled by animation

  uBubble.appendChild(uRole);
  uBubble.appendChild(uText);
  uRow.appendChild(uAvatar);
  uRow.appendChild(uBubble);

  // ── claude row ────────────────────────────────────────────────────────────
  const cRow = document.createElement("div");
  cRow.className = s.cardRow;
  cRow.style.display = "none"; // hidden until user msg done

  const cAvatar = document.createElement("div");
  cAvatar.className = `${s.avatar} ${s.avatarClaude}`;
  cAvatar.textContent = "C";

  const cBubble = document.createElement("div");
  cBubble.className = `${s.bubble} ${s.aiMsg}`;

  const cRole = document.createElement("div");
  cRole.className = s.role;
  cRole.textContent = "claude";

  const cText = document.createElement("span");

  let codeEl: HTMLElement | null = null;
  if (convo.code) {
    codeEl = document.createElement("code");
    codeEl.className = s.codeBlock;
    codeEl.style.display = "none";
  }

  cBubble.appendChild(cRole);
  cBubble.appendChild(cText);
  if (codeEl) cBubble.appendChild(codeEl);
  cRow.appendChild(cAvatar);
  cRow.appendChild(cBubble);

  el.appendChild(uRow);
  el.appendChild(cRow);

  // ── cursor ────────────────────────────────────────────────────────────────
  const cursor = document.createElement("span");
  cursor.className = s.cursor;
  uText.appendChild(cursor);

  const cancelAnim = animateCard(convo, uText, cText, codeEl, cursor, cRow);

  return { el, cancelAnim };
}

export default function CodeStreamBg() {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bg = bgRef.current;
    if (!bg) return;

    const CARD_W  = 290;
    const CARD_GAP = 24;
    const BASE_OP = 0.12;
    const SPEED   = 0.3;

    function getColCount() {
      return Math.max(1, Math.floor(window.innerWidth / (CARD_W + CARD_GAP)));
    }
    function colToX(col: number, colCount: number) {
      const totalW = colCount * CARD_W + (colCount - 1) * CARD_GAP;
      const startX = (window.innerWidth - totalW) / 2;
      return startX + col * (CARD_W + CARD_GAP);
    }

    let pool: CardEntry[] = [];
    let rafId: number;
    let lastT  = 0;
    let spawnT = 0;

    function pickCol(): number {
      const colCount = getColCount();
      const occupied = new Map<number, number>();
      for (const c of pool) occupied.set(c.col, Math.min(occupied.get(c.col) ?? Infinity, c.y));
      // prefer empty cols
      for (let i = 0; i < colCount; i++) {
        if (!occupied.has(i)) return i;
      }
      // fallback: col whose card is furthest from top (lowest on screen = least blocking)
      let best = 0, bestY = -Infinity;
      for (let i = 0; i < colCount; i++) {
        const y = occupied.get(i) ?? -Infinity;
        if (y > bestY) { bestY = y; best = i; }
      }
      return best;
    }

    function newEntry(el: HTMLDivElement, cancelAnim: () => void, x: number, y: number, col: number): CardEntry {
      return {
        el, x, y, col, cancelAnim,
        vy: -(SPEED + Math.random() * 0.15),
        vx: 0,
        baseOp: BASE_OP + Math.random() * 0.08,
      };
    }

    function spawnCard() {
      const H = window.innerHeight;
      const col = pickCol();
      const colCount = getColCount();
      const convo = CONVOS[Math.floor(Math.random() * CONVOS.length)];
      const { el, cancelAnim } = makeCardEl(convo, styles);
      bg!.appendChild(el);
      const x   = colToX(col, colCount);
      const y   = H + 60 + Math.random() * 120;
      const rot = (Math.random() - 0.5) * 4;
      el.style.transform = `rotate(${rot}deg)`;
      el.style.opacity   = "0";
      pool.push(newEntry(el, cancelAnim, x, y, col));
    }

    function seed() {
      const H        = window.innerHeight;
      const colCount = getColCount();
      for (let col = 0; col < colCount; col++) {
        const convo = CONVOS[col % CONVOS.length];
        const { el, cancelAnim } = makeCardEl(convo, styles);
        bg!.appendChild(el);
        const x   = colToX(col, colCount);
        const y   = H * 0.1 + Math.random() * H * 0.8;
        const rot = (Math.random() - 0.5) * 4;
        el.style.cssText = `left:${x}px;top:${y}px;transform:rotate(${rot}deg);opacity:0`;
        pool.push(newEntry(el, cancelAnim, x, y, col));
      }
    }

    function tick(t: number) {
      const dt = Math.min((t - lastT) / 16.67, 3);
      lastT  = t;
      spawnT += dt;

      const H        = window.innerHeight;
      const colCount = getColCount();
      // spawn at most one card every ~80 frames, and only if a col is free
      if (spawnT > 80 / colCount && pool.length < colCount * 3) {
        spawnT = 0;
        spawnCard();
      }

      for (let i = pool.length - 1; i >= 0; i--) {
        const c = pool[i];
        c.y += c.vy * dt;

        const fadeIn  = Math.min(1, (H - c.y) / 180);
        const fadeOut = Math.min(1, c.y / 120);
        const alpha   = c.baseOp * Math.max(0, fadeIn) * Math.max(0, fadeOut);

        c.el.style.left    = `${c.x}px`;
        c.el.style.top     = `${c.y}px`;
        c.el.style.opacity = `${alpha}`;

        if (c.y < -500) {
          c.el.remove();
          pool.splice(i, 1);
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    seed();
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      pool.forEach((c) => c.el.remove());
      pool = [];
    };
  }, []);

  return <div ref={bgRef} className={styles.bg} aria-hidden="true" />;
}
