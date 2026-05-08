import { useState, Children, isValidElement } from "react";
import type { ReactNode, ReactElement, ComponentPropsWithoutRef } from "react";
import { Icon } from "@iconify/react";
import styles from "./index.module.scss";

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) return extractText((node.props as { children?: ReactNode }).children);
  return "";
}

type CodeBlockProps = ComponentPropsWithoutRef<"pre"> & { node?: unknown };

export default function CodeBlock({ children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const codeEl = Children.toArray(children).find(
    (child) => isValidElement(child) && (child as ReactElement).type === "code"
  ) as ReactElement | undefined;

  const className = (codeEl?.props as { className?: string })?.className ?? "";
  const langMatch = className.match(/language-(\w+)/);
  const lang = langMatch ? langMatch[1] : "";

  const rawCode = extractText((codeEl?.props as { children?: ReactNode })?.children);

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
        <span className={styles.lang}>{lang || "text"}</span>
        <button className={styles.copyBtn} onClick={copy} aria-label="Copy code">
          <Icon
            icon={copied ? "lucide:check" : "lucide:copy"}
            width={13}
            height={13}
          />
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre {...(props as object)}>{children}</pre>
    </div>
  );
}
