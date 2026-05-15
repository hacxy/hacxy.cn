import { visit } from "unist-util-visit";
import type { Root, Text, Html } from "mdast";
import type { Plugin } from "unified";

const ICON_RE = /\{icon:([a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+)\}/g;

const remarkIconify: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      if (!ICON_RE.test(node.value)) return;

      ICON_RE.lastIndex = 0;
      const children: (Text | Html)[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = ICON_RE.exec(node.value)) !== null) {
        if (match.index > lastIndex) {
          children.push({ type: "text", value: node.value.slice(lastIndex, match.index) });
        }
        children.push({ type: "html", value: `<iconify icon="${match[1]}"></iconify>` });
        lastIndex = ICON_RE.lastIndex;
      }

      if (lastIndex < node.value.length) {
        children.push({ type: "text", value: node.value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...children);
    });
  };
};

export default remarkIconify;
