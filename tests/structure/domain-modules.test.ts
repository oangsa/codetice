import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const expectedDirectories = [
  "modules/auth/components",
  "modules/account/components",
  "modules/admin/components",
  "modules/questions/components",
  "modules/questions/editor",
  "modules/submissions/components",
  "modules/workspaces/components",
  "components/common",
  "server/auth",
  "server/grading",
  "server/languages",
  "server/scoreboard",
  "server/questions",
  "server/security",
  "server/submissions",
  "server/workspaces",
];

const retiredDirectories = [
  "components/admin",
  "components/auth",
  "components/commons",
  "components/editor",
  "components/questions",
  "components/settings",
  "components/submissions",
  "components/workspaces",
  "server/services",
  "lib/grader",
  "lib/validations",
];

const expectedServerModules = [
  "server/submissions/commands.ts",
  "server/submissions/queries.ts",
  "server/submissions/rejudge.ts",
  "server/grading/worker.ts",
  "server/grading/run-persistence.ts",
  "server/grading/score-persistence.ts",
  "server/questions/mutations.ts",
  "server/questions/queries.ts",
  "server/questions/types.ts",
  "server/workspaces/mutations.ts",
  "server/workspaces/queries.ts",
  "modules/auth/schema.ts",
  "modules/admin/language-schema.ts",
  "modules/questions/schema.ts",
  "modules/submissions/schema.ts",
  "modules/workspaces/schema.ts",
  "server/grading/run-code.ts",
  "server/languages/runtime-config.ts",
];

const pageModules = new Map([
  ["app/login/page.tsx", "@/modules/auth/pages/login-page"],
  ["app/register/page.tsx", "@/modules/auth/pages/register-page"],
  ["app/reset-password/page.tsx", "@/modules/auth/pages/reset-password-page"],
  ["app/settings/page.tsx", "@/modules/account/pages/settings-page"],
  ["app/admin/page.tsx", "@/modules/admin/pages/dashboard-page"],
  ["app/admin/languages/page.tsx", "@/modules/admin/pages/languages-page"],
  ["app/admin/users/page.tsx", "@/modules/admin/pages/users-page"],
  ["app/workspaces/page.tsx", "@/modules/workspaces/pages/workspaces-page"],
  ["app/workspaces/[id]/page.tsx", "@/modules/workspaces/pages/workspace-detail-page"],
  ["app/workspaces/[id]/members/page.tsx", "@/modules/workspaces/pages/members-page"],
  ["app/workspaces/[id]/questions/new/page.tsx", "@/modules/questions/pages/new-question-page"],
  ["app/workspaces/[id]/questions/[questionId]/page.tsx", "@/modules/questions/pages/question-page"],
  ["app/workspaces/[id]/questions/[questionId]/edit/page.tsx", "@/modules/questions/pages/edit-question-page"],
  ["app/workspaces/[id]/submissions/page.tsx", "@/modules/submissions/pages/submissions-page"],
  ["app/workspaces/[id]/submissions/[submissionId]/page.tsx", "@/modules/submissions/pages/submission-detail-page"],
]);

describe("domain-oriented project structure", () => {
  test("keeps route entrypoints separate from domain implementation", () => {
    for (const directory of expectedDirectories) {
      expect(existsSync(resolve(root, directory)), directory).toBe(true);
    }
  });

  test("retires the legacy technical-layer buckets", () => {
    for (const directory of retiredDirectories) {
      expect(existsSync(resolve(root, directory)), directory).toBe(false);
    }
  });

  test("separates domain reads, mutations, rejudges, and worker persistence", () => {
    for (const file of expectedServerModules) {
      expect(existsSync(resolve(root, file)), file).toBe(true);
    }
    expect(existsSync(resolve(root, "server/submissions/service.ts"))).toBe(false);
    expect(existsSync(resolve(root, "server/questions/service.ts"))).toBe(false);
    expect(existsSync(resolve(root, "server/workspaces/service.ts"))).toBe(false);
  });

  test("keeps Next page files as thin route entrypoints", () => {
    for (const [route, moduleImport] of pageModules) {
      const source = readFileSync(resolve(root, route), "utf8").trim();
      expect(source, route).toBe(`export { default } from "${moduleImport}";`);
    }
  });
});
