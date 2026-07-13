import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Markdown } from "@/components/ui/markdown";

describe("Markdown", () => {
  test("renders inline code with theme-aware contrast", () => {
    const markup = renderToStaticMarkup(<Markdown>{"Use `divisor` for a factor."}</Markdown>);

    expect(markup).toContain(
      '<code class="rounded bg-accent px-1.5 py-0.5 font-mono text-xs text-foreground">divisor</code>',
    );
  });

  test("renders fenced code without exposing the fence markers", () => {
    const markup = renderToStaticMarkup(<Markdown>{"```text\n1 + 2 + 3 = 6\n```"}</Markdown>);

    expect(markup).toContain(
      '<pre class="my-2 overflow-x-auto rounded-md border border-black/10 dark:border-white/10 bg-accent px-2 py-1.5 text-sm leading-6 text-foreground">',
    );
    expect(markup).toContain('class="block font-mono text-foreground language-text"');
    expect(markup).not.toContain("```");
  });
});
