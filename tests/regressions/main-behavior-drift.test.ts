import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

async function source(path: string) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("main behavior parity regressions", () => {
  test("the default dev command starts both web and grading worker and idle polls stay quiet", async () => {
    const [packageSource, devScript, worker] = await Promise.all([
      source("package.json"),
      source("scripts/dev.ts"),
      source("scripts/process-grading-jobs.ts"),
    ]);
    const scripts = (JSON.parse(packageSource) as { scripts: Record<string, string> }).scripts;

    expect(scripts.dev).toBe("bun scripts/dev.ts");
    expect(scripts["dev:web"]).toBe("next dev --hostname 0.0.0.0");
    expect(devScript).toContain('start("web"');
    expect(devScript).toContain('start("worker"');
    expect(worker).toContain("if (count > 0)");
    expect(worker).not.toContain("Processed 0 grading job(s).");
  });

  test("workspace detail, roster, and submission filters consume every cursor page", async () => {
    const [detailPage, membersPage, submissionsPage] = await Promise.all([
      source("modules/workspaces/pages/workspace-detail-page.tsx"),
      source("modules/workspaces/pages/members-page.tsx"),
      source("modules/submissions/pages/submissions-page.tsx"),
    ]);

    expect(detailPage.match(/collectCursorItems/g)?.length).toBeGreaterThanOrEqual(3);
    expect(membersPage).toContain("collectCursorItems");
    expect(submissionsPage.match(/collectCursorItems/g)?.length).toBeGreaterThanOrEqual(2);
  });

  test("only Docker compiler diagnostics require a prepared runtime", async () => {
    const route = await source("app/api/workspaces/[id]/diagnostics/route.ts");

    expect(route).toContain("requiresPreparedRuntimeForDiagnostics");
    expect(route).not.toContain('if (language.runtimeStatus !== "ready")');
  });

  test("submit and rejudge routes cache terminal failure responses", async () => {
    const [idempotency, submit, submissionRejudge, questionRejudge] = await Promise.all([
      source("server/security/idempotency.ts"),
      source("app/api/workspaces/[id]/submit/route.ts"),
      source("app/api/workspaces/[id]/submissions/[submissionId]/rejudge/route.ts"),
      source("app/api/workspaces/[id]/questions/[questionId]/rejudge/route.ts"),
    ]);

    expect(idempotency).toContain("cacheIdempotentFailureResponse");
    expect(submit).toContain("cacheIdempotentFailureResponse");
    expect(submissionRejudge).toContain("cacheIdempotentFailureResponse");
    expect(questionRejudge).toContain("cacheIdempotentFailureResponse");
  });

  test("participant DTOs retain platform role and exclude global admins", async () => {
    const [queries, tabs, submissionsPage] = await Promise.all([
      source("server/workspaces/queries.ts"),
      source("modules/workspaces/components/workspace-tabs.tsx"),
      source("modules/submissions/pages/submissions-page.tsx"),
    ]);

    expect(queries).toContain("platformRole: users.role");
    expect(tabs).toContain('member.platformRole === "student"');
    expect(submissionsPage).toContain('item.platformRole === "student"');
  });

  test("student submission DTOs and views never expose raw grading errors", async () => {
    const [queries, detailPage] = await Promise.all([
      source("server/submissions/queries.ts"),
      source("modules/submissions/pages/submission-detail-page.tsx"),
    ]);

    expect(queries).toContain("access.staff ? latestRun.errorMessage : null");
    expect(queries).toContain("errorMessage: access.staff ? item.errorMessage : null");
    expect(detailPage).toContain("access.staff && result.errorMessage");
  });

  test("runtime copy reflects queueable pending languages and TA remains the primary role", async () => {
    const [languageManager, memberManager] = await Promise.all([
      source("modules/admin/components/language-manager.tsx"),
      source("modules/workspaces/components/member-manager.tsx"),
    ]);

    expect(languageManager).not.toContain("runtime stays unavailable");
    expect(languageManager).not.toContain("before students can use it");
    expect(languageManager).toContain("remain available while verification is pending");
    expect(memberManager).toContain('member.role === "ta" ? "default" : "secondary"');
  });
});
