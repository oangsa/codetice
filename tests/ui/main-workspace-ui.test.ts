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
    expect(page).not.toContain('eyebrow="Workspace"');
    expect(page).toContain('className="flex flex-col items-center"');
    expect(page).toContain('className="flex items-center gap-2"');
    expect(page).not.toContain('className="absolute right-0 top-[28px]"');
    expect(tabs).not.toContain("Workspace Sections");
    expect(tabs).toContain("Scoreboard");
    expect(tabs).toContain("Participants");
    expect(tabs).toContain("const tabListRef");
    expect(tabs).toContain("left: activeButton.offsetLeft");
    expect(tabs).toContain("width: activeButton.offsetWidth");
    expect(tabs).toContain("new ResizeObserver(updateIndicator)");
    expect(tabs).toContain("Object.values(tabRefs.current)");
    expect(tabs).toContain("resizeObserver.observe(tabButton)");
    expect(tabs).toContain('className="relative flex h-10 w-max shrink-0');
    expect(tabs).toContain('rounded-full bg-[var(--tint-sm)] p-1');
    expect(tabs).toContain('className="pointer-events-none absolute top-1 h-8 rounded-full bg-background"');
    expect(tabs).toContain("disableTooltip");
    expect(tabs).toContain("hover:bg-transparent");
    expect(tabs).not.toContain("last:mr-");
    expect(tabs).not.toContain("flex-1 cursor-pointer");
    expect(tabs).toContain("event.detail !== 0");
    expect(tabs).toContain("event.currentTarget.blur()");
    expect(tabs).not.toContain("animate-rubber");
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
    expect(editor).toContain("Submit");
    expect(editor).not.toContain("runSamples");
    expect(editor).not.toContain("/api/workspaces/${workspaceId}/run-sample");
  });

  test("keeps long multi-select option lists scrollable without scrolling the page", async () => {
    const [multiSelect, scrollArea] = await Promise.all([
      source("components/ui/multi-select.tsx"),
      source("components/ui/scroll-area.tsx"),
    ]);

    expect(scrollArea).toContain("viewportClassName?: string");
    expect(scrollArea).toContain('cn("h-full w-full rounded-[inherit]", viewportClassName)');
    expect(multiSelect).toContain('viewportClassName="max-h-60 overscroll-contain"');
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
    expect(page).not.toContain('eyebrow="Overview"');
    expect(page).not.toContain("Review active workspaces, open a teaching workspace, or join a workspace with an invite code.");
    expect(page).not.toContain('className="mb-3 h-5"');
    expect(queries).toContain("ilike(workspaces.name");
    expect(queries).toContain("workspaceSearchWhere");
  });

  test("exposes workspace lifecycle controls only through the dedicated settings component", async () => {
    const [page, actions] = await Promise.all([
      source("modules/workspaces/pages/workspace-detail-page.tsx"),
      source("modules/workspaces/components/workspace-lifecycle-actions.tsx"),
    ]);

    expect(page).toContain("<WorkspaceLifecycleActions");
    expect(page).toContain("listWorkspaceOwnershipCandidates");
    expect(actions).toContain("Edit workspace");
    expect(actions).toContain("Transfer ownership");
    expect(actions).toContain("Delete workspace");
    expect(actions).toContain("/owner");
  });

  test("keeps large workspace-clone question lists scrollable without scrolling the dialog", async () => {
    const cloneDialog = await source("modules/workspaces/components/workspace-clone-dialog.tsx");

    expect(cloneDialog).toContain('className="max-h-[85dvh] overflow-hidden sm:max-w-2xl"');
    expect(cloneDialog).toContain('className="max-h-[45dvh] overflow-y-auto overscroll-contain rounded-md border"');
    expect(cloneDialog).not.toContain('className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl"');
  });

  test("offers a publish-all control for eligible cloned questions", async () => {
    const cloneDialog = await source("modules/workspaces/components/workspace-clone-dialog.tsx");

    expect(cloneDialog).toContain("function setPublishAll");
    expect(cloneDialog).toContain("Publish all");
    expect(cloneDialog).toContain("publishableQuestions");
    expect(cloneDialog).toContain("Questions without test cases will remain drafts.");
  });

  test("loads draft questions when edit mode is opened directly", async () => {
    const [table, searchHook] = await Promise.all([
      source("modules/workspaces/components/question-table.tsx"),
      source("lib/use-collection-search.ts"),
    ]);

    expect(table).toContain("initialRequest: publishedQuestionRequest");
    expect(searchHook).toContain("input.initialRequest ?? input.request");
  });

  test("renders question tags as a compact text summary beneath the title", async () => {
    const [table, page] = await Promise.all([
      source("modules/workspaces/components/question-table.tsx"),
      source("modules/questions/pages/question-page.tsx"),
    ]);

    expect(table).toContain('tag: {question.tags.map((tag) => tag.name).join(", ")}');
    expect(table).not.toContain('id: "tags"');
    expect(page).toContain('tag: {question.tags.map((tag) => tag.name).join(", ")}');
    expect(page).not.toContain("Problem workspace");
    expect(page).toContain('className="ml-auto flex shrink-0 items-center gap-2"');
    expect(page).toContain('Badge variant="secondary" className="h-5 self-center rounded-full px-2.5 py-0 text-[10px] font-semibold uppercase leading-none tracking-wide"');
    const problemTabs = await source("modules/questions/components/problem-tabs.tsx");
    expect(problemTabs).toContain("disableTooltip");
    expect(problemTabs).toContain("const tabListRef");
    expect(problemTabs).toContain("left: activeButton.offsetLeft");
    expect(problemTabs).toContain("width: activeButton.offsetWidth");
    expect(problemTabs).toContain("new ResizeObserver(updateIndicator)");
    expect(problemTabs).toContain('className="pointer-events-none absolute top-[2px] h-[36px] rounded-full bg-[var(--tint-sm)]"');
    expect(problemTabs).toContain("bg-transparent px-3 text-sm");
    expect(problemTabs).toContain("text-slate-500 hover:text-slate-500");
    expect(problemTabs).toContain("focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0");
    expect(problemTabs).not.toContain("flex-1 cursor-pointer");
    expect(problemTabs).not.toContain("animate-rubber");
    expect(problemTabs).not.toContain("hover:text-slate-700");
  });

  test("keeps the desktop shell comfortable at normal browser zoom", async () => {
    const [globals, shell, header] = await Promise.all([
      source("app/globals.css"),
      source("components/root-layout-client.tsx"),
      source("components/site-header.tsx"),
    ]);

    expect(globals).toContain("@media (min-width: 1024px)");
    expect(globals).toContain("font-size: 125%;");
    expect(shell).toContain("w-full flex-grow");
    expect(shell).not.toContain("max-w-[1440px]");
    expect(header).toContain("w-full");
    expect(header).not.toContain("max-w-[1440px]");
    expect(header).toContain("lg:px-8");
  });

  test("keeps the add-question action content-sized at the desktop baseline", async () => {
    const table = await source("modules/workspaces/components/question-table.tsx");

    expect(table).toContain('className="h-9 rounded-full px-4 !text-primary-foreground hover:!text-primary-foreground"');
    expect(table).not.toContain("w-[150px]");
  });

  test("uses the shared advanced-filter dialog for submission history", async () => {
    const filters = await source("modules/submissions/components/workspace-submission-filters.tsx");

    expect(filters).toContain("Filter submissions");
    expect(filters).toContain("<Dialog");
    expect(filters).toContain("<Filter");
    expect(filters).toContain('className="rounded-2xl shadow-none"');
    expect(filters).not.toContain('className="flex flex-wrap items-center gap-2"');
  });
});
