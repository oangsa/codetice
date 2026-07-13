export const PRESET_TAGS = [
  { name: "Arrays", slug: "arrays" },
  { name: "Strings", slug: "strings" },
  { name: "Loops", slug: "loops" },
  { name: "Conditionals", slug: "conditionals" },
  { name: "Functions", slug: "functions" },
  { name: "Recursion", slug: "recursion" },
  { name: "Sorting", slug: "sorting" },
  { name: "Searching", slug: "searching" },
  { name: "Math", slug: "math" },
  { name: "Stack/Queue", slug: "stack-queue" },
  { name: "Tree", slug: "tree" },
  { name: "Graph", slug: "graph" },
  { name: "Dynamic Programming", slug: "dynamic-programming" },
] as const;

export type WorkspaceTag = {
  id: string;
  name: string;
  slug: string;
  isPreset: boolean;
};
