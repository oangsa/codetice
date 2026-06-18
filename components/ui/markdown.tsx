import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const TRANSLATIONS: Record<string, string> = {
  "ตัวอย่าง": "Samples",
  "ตัวอย่างข้อมูลนำเข้า": "Input",
  "ตัวอย่างข้อมูลส่งออก": "Output",
  "ข้อมูลนำเข้า": "Input",
  "ข้อมูลส่งออก": "Output",
  "ผลลัพธ์": "Output",
  "ตัวอย่างผลลัพธ์": "Output",
  "ตัวอย่างผลรัน": "Output",
};

function translateThaiText(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string") {
    const trimmed = children.trim();
    return TRANSLATIONS[trimmed] || children;
  }
  if (Array.isArray(children)) {
    return children.map((child) => translateThaiText(child));
  }
  if (React.isValidElement(children)) {
    const element = children as React.ReactElement<any>;
    return React.cloneElement(element, {
      children: translateThaiText(element.props.children),
    });
  }
  return children;
}

function renderContentWithLineBreaks(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string") {
    return children.replace(/<br\s*\/?>/gi, "\n");
  }
  if (Array.isArray(children)) {
    return children.map((child, idx) => {
      if (typeof child === "string") {
        return child.replace(/<br\s*\/?>/gi, "\n");
      }
      return child;
    });
  }
  return children;
}

const COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 text-2xl font-bold tracking-tight text-slate-900 first:mt-0">
      {translateThaiText(children)}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-5 text-xl font-semibold text-slate-900 first:mt-0">
      {translateThaiText(children)}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold text-slate-900 first:mt-0">
      {translateThaiText(children)}
    </h3>
  ),
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-sky-600 underline underline-offset-2 hover:text-sky-800"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-6">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-slate-300 pl-4 italic text-slate-500">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-slate-200 dark:border-slate-800" />,
  // Code — inline vs block distinguished by whether parent is <pre>
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-4 text-sm leading-6">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    // Inside <pre> → block code; no className → inline code
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className={cn("font-mono text-slate-800 dark:text-slate-200", className)}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 font-mono text-xs text-slate-800 dark:text-slate-200">
        {children}
      </code>
    );
  },
  // Tables (GitHub Flavored Markdown)
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-black/10 dark:border-white/10">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-black/10 dark:divide-white/10">{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-black/10 dark:border-white/10 last:border-0">{children}</tr>,
  th: ({ children }) => {
    const formattedChildren = translateThaiText(renderContentWithLineBreaks(children));
    return (
      <th className="px-4 py-2 text-left align-top font-semibold text-slate-900 dark:text-white border-r border-black/10 dark:border-white/10 last:border-r-0">
        {formattedChildren}
      </th>
    );
  },
  td: ({ children }) => {
    const formattedChildren = translateThaiText(renderContentWithLineBreaks(children));
    return (
      <td className="px-4 py-2 text-slate-700 dark:text-slate-300 align-top whitespace-pre-wrap border-r border-black/10 dark:border-white/10 last:border-r-0">
        {formattedChildren}
      </td>
    );
  },
};

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("text-sm leading-7 text-slate-700", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
