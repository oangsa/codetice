import { SUPPORTED_LANGUAGE_SLUGS } from "@/lib/constants";

export type SupportedLanguageSlug = (typeof SUPPORTED_LANGUAGE_SLUGS)[number];

type RuntimeProfile = {
  dockerImage: string;
  fileExtension: string;
  runCommand: string;
  command: string;
  args: string[];
};

export const RUNTIME_PROFILES: Record<SupportedLanguageSlug, RuntimeProfile> = {
  python: {
    dockerImage: "python:3.12-alpine",
    fileExtension: "py",
    runCommand: "python {file}",
    command: "python",
    args: ["/workspace/main.py"],
  },
  javascript: {
    dockerImage: "node:22-alpine",
    fileExtension: "js",
    runCommand: "node {file}",
    command: "node",
    args: ["/workspace/main.js"],
  },
  typescript: {
    dockerImage: "oven/bun:1-alpine",
    fileExtension: "ts",
    runCommand: "bun {file}",
    command: "bun",
    args: ["/workspace/main.ts"],
  },
};

export function isSupportedLanguageSlug(value: string): value is SupportedLanguageSlug {
  return SUPPORTED_LANGUAGE_SLUGS.includes(value as SupportedLanguageSlug);
}

export function getRuntimeProfile(slug: string) {
  if (!isSupportedLanguageSlug(slug)) {
    throw new Error(`Unsupported language slug '${slug}'.`);
  }

  return RUNTIME_PROFILES[slug];
}

export function hasRuntimeProfile(slug: string) {
  return isSupportedLanguageSlug(slug);
}
