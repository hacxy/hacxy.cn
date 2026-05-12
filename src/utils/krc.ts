export interface KrcChar {
  id: string;
  offset: number;
  duration: number;
  char: string;
}

export interface KrcLine {
  id: string;
  time: number;
  duration: number;
  chars: KrcChar[];
  text: string;
}

export function parseKrc(raw: string): KrcLine[] {
  const parsed: Omit<KrcLine, 'id'>[] = [];
  const lineRe = /^\[(\d+),(\d+)\](.*)$/;
  const charRe = /<(\d+),(\d+),\d+>([^<]*)/g;

  for (const line of raw.split('\n')) {
    const lm = line.match(lineRe);
    if (!lm) continue;
    const lineStart = parseInt(lm[1], 10);
    const lineDur = parseInt(lm[2], 10);
    const rest = lm[3];

    const chars: KrcChar[] = [];
    let m: RegExpExecArray | null;
    let charIdx = 0;
    charRe.lastIndex = 0;
    while ((m = charRe.exec(rest)) !== null) {
      const ch = m[3];
      if (!ch) continue;
      chars.push({
        id: `${lineStart}-${charIdx++}`,
        offset: parseInt(m[1], 10),
        duration: parseInt(m[2], 10),
        char: ch,
      });
    }

    if (chars.length === 0) continue;
    const text = chars.map((c) => c.char).join('');
    if (!text.trim()) continue;

    parsed.push({
      time: lineStart / 1000,
      duration: lineDur / 1000,
      chars,
      text,
    });
  }

  return parsed
    .sort((a, b) => a.time - b.time)
    .map((line, i) => ({ ...line, id: String(i) }));
}
