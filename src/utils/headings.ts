import { textToId } from "./slugify";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function extractHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;
  const idCount = new Map<string, number>();

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{2,4})\s+(.+)$/);
    if (!match) continue;

    const text = match[2].trim();
    const baseId = textToId(text);
    const count = idCount.get(baseId) ?? 0;
    idCount.set(baseId, count + 1);
    const id = count > 0 ? `${baseId}-${count}` : baseId;
    headings.push({ id, text, level: match[1].length });
  }

  return headings;
}
