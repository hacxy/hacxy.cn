export interface LrcLine {
  id: string;
  time: number;
  text: string;
}

export function parseLrc(raw: string): LrcLine[] {
  const parsed: Omit<LrcLine, 'id'>[] = [];
  const re = /\[(\d{2}):(\d{2})\.(\d+)\](.*)/;

  for (const line of raw.split('\n')) {
    const m = line.match(re);
    if (!m) continue;
    const text = m[4].trim();
    if (!text) continue;
    const minutes = parseInt(m[1], 10);
    const seconds = parseInt(m[2], 10);
    const ms = parseInt(m[3].substring(0, 3).padEnd(3, '0'), 10);
    parsed.push({ time: minutes * 60 + seconds + ms / 1000, text });
  }

  return parsed
    .sort((a, b) => a.time - b.time)
    .map((line, i) => ({ ...line, id: String(i) }));
}
