import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let promise: Promise<Awaited<ReturnType<typeof createHighlighterCore>>> | null = null;

export function getHighlighter() {
  if (!promise) {
    promise = createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [
        import("shiki/themes/github-light.mjs"),
        import("shiki/themes/github-dark.mjs"),
      ],
      langs: [
        import("shiki/langs/typescript.mjs"),
        import("shiki/langs/javascript.mjs"),
        import("shiki/langs/tsx.mjs"),
        import("shiki/langs/jsx.mjs"),
        import("shiki/langs/yaml.mjs"),
        import("shiki/langs/json.mjs"),
        import("shiki/langs/markdown.mjs"),
        import("shiki/langs/bash.mjs"),
        import("shiki/langs/css.mjs"),
        import("shiki/langs/scss.mjs"),
        import("shiki/langs/html.mjs"),
        import("shiki/langs/python.mjs"),
        import("shiki/langs/go.mjs"),
        import("shiki/langs/rust.mjs"),
        import("shiki/langs/sql.mjs"),
        import("shiki/langs/diff.mjs"),
      ],
    });
  }
  return promise;
}
