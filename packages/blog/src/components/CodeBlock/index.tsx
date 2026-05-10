import { useState, useEffect, isValidElement } from "react";
import type { ReactNode, ReactElement, ComponentPropsWithoutRef } from "react";
import { Icon } from "@iconify/react";
import { getHighlighter } from "../../utils/highlighter";
import styles from "./index.module.scss";

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) return extractText((node.props as { children?: ReactNode }).children);
  return "";
}

function findCodeElement(children: ReactNode): ReactElement | undefined {
  const nodes = Array.isArray(children) ? children : [children];
  return nodes.find(
    (child) => isValidElement(child) && (child as ReactElement).type === "code"
  ) as ReactElement | undefined;
}

type CodeBlockProps = ComponentPropsWithoutRef<"pre"> & { node?: unknown };

export default function CodeBlock({ children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [shikiHtml, setShikiHtml] = useState<string>("");

  const codeEl = findCodeElement(children);

  const className = (codeEl?.props as { className?: string })?.className ?? "";
  const langMatch = className.match(/language-(\w+)/);
  const lang = langMatch ? langMatch[1] : "text";

  const rawCode = extractText((codeEl?.props as { children?: ReactNode })?.children);

  useEffect(() => {
    getHighlighter().then((hl) => {
      const supported = hl.getLoadedLanguages().includes(lang);
      const html = hl.codeToHtml(rawCode, {
        lang: supported ? lang : "text",
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
      });
      const inner = html.match(/<code[^>]*>([\s\S]*)<\/code>/)?.[1] ?? "";
      setShikiHtml(inner);
    });
  }, [rawCode, lang]);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(rawCode);
      } else {
        const ta = document.createElement("textarea");
        ta.value = rawCode;
        ta.style.cssText = "position:fixed;left:-9999px;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // copy failed
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.lang}>{lang}</span>
        <button className={styles.copyBtn} onClick={copy} aria-label="Copy code">
          <Icon icon={copied ? "lucide:check" : "lucide:copy"} width={13} height={13} />
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      {shikiHtml ? (
        <pre className={styles.shikiPre}>
          <code dangerouslySetInnerHTML={{ __html: shikiHtml }} />
        </pre>
      ) : (
        <pre {...(props as object)}>{children}</pre>
      )}
    </div>
  );
}
