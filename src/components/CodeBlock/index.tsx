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
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
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
