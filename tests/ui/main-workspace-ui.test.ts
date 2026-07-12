import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

async function source(path: string) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("main-style workspace UI", () => {
  test("keeps the main workspace sections and question table", async () => {
    const [page, tabs, table, card, progress] = await Promise.all([
      source("modules/workspaces/pages/workspace-detail-page.tsx"),
      source("modules/workspaces/components/workspace-tabs.tsx"),
      source("modules/workspaces/components/question-table.tsx"),
      source("modules/workspaces/components/workspace-card.tsx"),
      source("components/ui/progress.tsx"),
    ]);

    expect(page).toContain("<WorkspaceTabs");
    expect(tabs).toContain("Workspace Sections");
    expect(tabs).toContain("Scoreboard");
    expect(tabs).toContain("Participants");
    expect(table).toContain('placeholder="Search by name"');
    expect(table).not.toContain("assignment");
    expect(table).toContain('textClassName: "text-slate-900"');
    expect(card).toContain("hover:bg-[#dcdce3] dark:hover:bg-slate-900/20");
    expect(card).toContain("text-slate-900 dark:text-white");
    expect(progress).toContain("bg-white dark:bg-slate-950");
  });

  test("keeps the main split problem workspace for submitting", async () => {
    const [page, problemTabs, editor] = await Promise.all([
      source("modules/questions/pages/question-page.tsx"),
      source("modules/questions/components/problem-tabs.tsx"),
      source("modules/questions/editor/code-editor.tsx"),
    ]);
    expect(page).toContain("<ProblemTabs");
    expect(page).toContain("<CodeEditor");
    expect(page).toContain("ResizablePanelGroup");
    expect(page).not.toContain("assignmentId");
    expect(problemTabs).toContain("border-slate-200 bg-slate-100 p-4");
    expect(problemTabs).toContain("dark:border-slate-800 bg-slate-800 p-3 text-sm text-slate-900");
    expect(problemTabs).not.toContain("dark:bg-slate-900/40");
    expect(problemTabs).not.toContain("dark:text-slate-100");
    expect(editor).toContain('EDITOR_MARKER_OWNER = "language-diagnostics"');
    expect(editor).toContain("/api/workspaces/${workspaceId}/diagnostics");
  });

  test("links every nested workspace page from the visible workspace flow", async () => {
    const [tabs, questions, submissions, userMenu] = await Promise.all([
      source("modules/workspaces/components/workspace-tabs.tsx"),
      source("modules/workspaces/components/question-table.tsx"),
      source("modules/submissions/components/submission-table.tsx"),
      source("components/user-menu.tsx"),
    ]);

    expect(tabs).not.toContain("/leaderboard");
    expect(tabs).toContain("/members");
    expect(questions).toContain("/submissions");
    expect(questions).toContain("/questions/new");
    expect(questions).toContain("/edit");
    expect(submissions).toContain("/submissions/${submission.id}");
    expect(userMenu).toContain('href="/admin/users"');
    expect(userMenu).toContain('href="/admin/languages"');
    expect(userMenu).toContain('href="/settings"');
  });

  test("keeps submission revision as a compact ghost action with text", async () => {
    const revise = await source("modules/submissions/components/revise-submission-button.tsx");

    expect(revise).toContain('variant="ghost"');
    expect(revise).toContain('aria-label="Revise submission"');
    expect(revise).not.toContain('size="icon"');
    expect(revise).toContain("\n      Revise\n");
  });

  test("uses the shared pill actions and table treatment for authoring and members", async () => {
    const [form, testcaseDialog, members] = await Promise.all([
      source("modules/questions/components/question-form.tsx"),
      source("modules/questions/components/testcase-dialog.tsx"),
      source("modules/workspaces/components/member-manager.tsx"),
    ]);

    expect(form).toContain('const questionActionButtonClass = "h-10 rounded-full px-5 font-semibold"');
    expect(form).toContain("<FileUploadTrigger");
    expect(testcaseDialog).toContain('className="h-10 rounded-full px-5 font-semibold"');
    expect(members).toContain("rowClassName={");
    expect(members).toContain('className="h-10 rounded-full px-5 font-semibold"');
  });

  test("keeps the workspace card directory searchable", async () => {
    const [directory, page, queries] = await Promise.all([
      source("modules/workspaces/components/workspace-search.tsx"),
      source("modules/workspaces/pages/workspaces-page.tsx"),
      source("server/workspaces/queries.ts"),
    ]);

    expect(directory).toContain('placeholder="Search workspace"');
    expect(directory).toContain('endpoint: "/api/workspaces/search"');
    expect(directory).toContain('searchTerm: { name: "name", value }');
    expect(page).toContain("<WorkspaceSearch");
    expect(page).toContain("initialPage={page}");
    expect(page).toContain('className="space-y-4"');
    expect(page).toContain('className="py-0"');
    expect(page).not.toContain('className="mb-3 h-5"');
    expect(queries).toContain("ilike(workspaces.name");
    expect(queries).toContain("workspaceSearchWhere");
  });

  test("loads draft questions when edit mode is opened directly", async () => {
    const [table, searchHook] = await Promise.all([
      source("modules/workspaces/components/question-table.tsx"),
      source("lib/use-collection-search.ts"),
    ]);

    expect(table).toContain("initialRequest: publishedQuestionRequest");
    expect(searchHook).toContain("input.initialRequest ?? input.request");
  });
});
