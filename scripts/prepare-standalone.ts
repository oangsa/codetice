import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async function copyIntoStandalone(source: string, destination: string) {
  if (!existsSync(source)) return;
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
}

const root = process.cwd();

await copyIntoStandalone(
  resolve(root, "public"),
  resolve(root, ".next/standalone/public"),
);
await copyIntoStandalone(
  resolve(root, ".next/static"),
  resolve(root, ".next/standalone/.next/static"),
);
