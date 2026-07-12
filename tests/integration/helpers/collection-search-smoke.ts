import { closeDb } from "@/lib/db";
import { parseCollectionSearch } from "@/lib/collection-search";
import { searchUsersPage } from "@/server/auth/service";
import { searchWorkspaceQuestionsPage } from "@/server/questions/queries";
import { searchWorkspaceScoreboardPage } from "@/server/scoreboard/service";
import { searchWorkspaceSubmissionsPage } from "@/server/submissions/queries";
import {
  getWorkspaceDetail,
  searchWorkspaceMembersPage,
  searchWorkspacesPage,
  workspaceSearchConfig,
} from "@/server/workspaces/queries";

const workspaceId = "00000000-0000-0000-0000-000000000101";
const student = { userId: "00000000-0000-0000-0000-000000000002", role: "student" as const };
const admin = { userId: "00000000-0000-0000-0000-000000000001", role: "admin" as const };
const otherAdmin = { userId: "00000000-0000-0000-0000-000000000004", role: "admin" as const };
const ta = { userId: "00000000-0000-0000-0000-000000000003", role: "student" as const };

try {
  const firstWorkspacePage = await searchWorkspacesPage({
    actor: student,
    search: parseCollectionSearch({ limit: 1 }, workspaceSearchConfig),
  });
  const secondWorkspacePage = await searchWorkspacesPage({
    actor: student,
    search: parseCollectionSearch({ limit: 1, cursor: firstWorkspacePage.nextCursor }, workspaceSearchConfig),
  });
  const firstAdminWorkspacePage = await searchWorkspacesPage({
    actor: admin,
    search: parseCollectionSearch({ limit: 1 }, workspaceSearchConfig),
  });
  let crossAdminWorkspaceCursorStatus: number | null = null;
  try {
    await searchWorkspacesPage({
      actor: otherAdmin,
      search: parseCollectionSearch({
        limit: 1,
        cursor: firstAdminWorkspacePage.nextCursor,
      }, workspaceSearchConfig),
    });
  } catch (error) {
    crossAdminWorkspaceCursorStatus = error && typeof error === "object" && "status" in error
      ? Number(error.status)
      : null;
  }
  const firstQuestionPage = await searchWorkspaceQuestionsPage({ actor: student, workspaceId, body: { limit: 1 } });
  const secondQuestionPage = await searchWorkspaceQuestionsPage({
    actor: student,
    workspaceId,
    body: { limit: 1, cursor: firstQuestionPage.nextCursor },
  });
  const firstMemberPage = await searchWorkspaceMembersPage({ actor: admin, workspaceId, body: { limit: 1 } });
  const secondMemberPage = await searchWorkspaceMembersPage({
    actor: admin,
    workspaceId,
    body: { limit: 1, cursor: firstMemberPage.nextCursor },
  });
  const firstSubmissionPage = await searchWorkspaceSubmissionsPage({ actor: student, workspaceId, body: { limit: 1 } });
  const secondSubmissionPage = await searchWorkspaceSubmissionsPage({
    actor: student,
    workspaceId,
    body: { limit: 1, cursor: firstSubmissionPage.nextCursor },
  });
  const firstUserPage = await searchUsersPage({ limit: 1 });
  const secondUserPage = await searchUsersPage({ limit: 1, cursor: firstUserPage.nextCursor });
  const workspaceDetail = await getWorkspaceDetail(student, workspaceId);

  const adminQuestionPage = await searchWorkspaceQuestionsPage({ actor: admin, workspaceId, body: { limit: 1 } });
  let crossActorQuestionCursorStatus: number | null = null;
  try {
    await searchWorkspaceQuestionsPage({
      actor: ta,
      workspaceId,
      body: { limit: 1, cursor: adminQuestionPage.nextCursor },
    });
  } catch (error) {
    crossActorQuestionCursorStatus = error && typeof error === "object" && "status" in error
      ? Number(error.status)
      : null;
  }

  let mismatchedCursorStatus: number | null = null;
  try {
    await searchWorkspacesPage({
      actor: student,
      search: parseCollectionSearch({
        limit: 1,
        cursor: firstWorkspacePage.nextCursor,
        searchTerm: { name: "name", value: "One" },
      }, workspaceSearchConfig),
    });
  } catch (error) {
    mismatchedCursorStatus = error && typeof error === "object" && "status" in error
      ? Number(error.status)
      : null;
  }

  const [questions, members, submissions, scoreboard, literalWildcard] = await Promise.all([
    searchWorkspaceQuestionsPage({
      actor: student,
      workspaceId,
      body: { searchTerm: { name: "title,slug", value: "Single" } },
    }),
    searchWorkspaceMembersPage({
      actor: admin,
      workspaceId,
      body: { searchTerm: { name: "username", value: "student" } },
    }),
    searchWorkspaceSubmissionsPage({
      actor: student,
      workspaceId,
      body: { searchTerm: { name: "questionTitle", value: "Single" } },
    }),
    searchWorkspaceScoreboardPage({
      actor: student,
      workspaceId,
      body: { searchTerm: { name: "username", value: "student" } },
    }),
    searchWorkspacesPage({
      actor: student,
      search: parseCollectionSearch({ searchTerm: { name: "name", value: "%" } }, workspaceSearchConfig),
    }),
  ]);

  process.stdout.write(JSON.stringify({
    crossAdminWorkspaceCursorStatus,
    workspacePages: [firstWorkspacePage.items.map((item) => item.name), secondWorkspacePage.items.map((item) => item.name)],
    questionPages: [firstQuestionPage.items.map((item) => item.title), secondQuestionPage.items.map((item) => item.title)],
    memberPages: [firstMemberPage.items.map((item) => item.username), secondMemberPage.items.map((item) => item.username)],
    submissionPages: [firstSubmissionPage.items.map((item) => item.question.title), secondSubmissionPage.items.map((item) => item.question.title)],
    userPages: [firstUserPage.items.map((item) => item.username), secondUserPage.items.map((item) => item.username)],
    workspaceDetail: {
      memberCount: workspaceDetail.memberCount,
      questionCount: workspaceDetail.questionCount,
      solvedCount: workspaceDetail.solvedCount,
    },
    crossActorQuestionCursorStatus,
    mismatchedCursorStatus,
    questions: questions.items.map((item) => item.title),
    members: members.items.map((item) => item.username),
    submissions: submissions.items.map((item) => item.question.title),
    scoreboard: scoreboard.items.map((item) => item.username),
    literalWildcardCount: literalWildcard.items.length,
  }));
} finally {
  await closeDb();
}
