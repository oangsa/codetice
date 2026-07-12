import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("student"),
    profilePicture: text("profile_picture").default("/avatars/avatar-1.png").notNull(),
    tokenVersion: integer("token_version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    roleCheck: check("users_role_check", sql`${table.role} in ('student', 'admin')`),
  }),
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: false }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: false }),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("password_reset_tokens_token_hash_unique").on(table.tokenHash),
    userCreatedAtIdx: index("password_reset_tokens_user_created_at_idx").on(table.userId, table.createdAt),
  }),
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    requestHash: text("request_hash").notNull(),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: false }),
  },
  (table) => ({
    identifierActionKeyUnique: uniqueIndex("idempotency_keys_identifier_action_key_unique").on(
      table.identifier,
      table.action,
      table.key,
    ),
    actionCreatedAtIdx: index("idempotency_keys_action_created_at_idx").on(table.action, table.createdAt),
  }),
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description").notNull(),
    difficulty: varchar("difficulty", { length: 20 }).notNull().default("easy"),
    totalScore: decimal("total_score", { precision: 10, scale: 2 }).notNull().default("100"),
    timeLimitMs: integer("time_limit_ms").notNull().default(2000),
    memoryLimitMb: integer("memory_limit_mb").notNull().default(128),
    starterCode: text("starter_code"),
    starterCodeByLanguage: text("starter_code_by_language"),
    allowedLanguages: text("allowed_languages"),
    isPublished: boolean("is_published").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceSlugUnique: uniqueIndex("questions_workspace_slug_unique").on(table.workspaceId, table.slug),
    workspaceIdIdUnique: uniqueIndex("questions_workspace_id_id_unique").on(table.workspaceId, table.id),
    workspaceCreatedAtIdx: index("questions_workspace_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
      table.id,
    ),
    workspacePublishedIdx: index("questions_workspace_published_idx").on(
      table.workspaceId,
      table.isPublished,
      table.createdAt,
      table.id,
    ),
  }),
);

export const testcases = pgTable(
  "testcases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }),
    input: text("input").notNull(),
    expectedOutput: text("expected_output").notNull(),
    isSample: boolean("is_sample").notNull().default(false),
    isHidden: boolean("is_hidden").notNull().default(true),
    checkerType: varchar("checker_type", { length: 50 }).notNull().default("exact"),
    floatTolerance: decimal("float_tolerance", { precision: 20, scale: 10 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    questionSortIdx: index("testcases_question_sort_idx").on(table.questionId, table.sortOrder, table.createdAt),
  }),
);

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  language: varchar("language", { length: 50 }).notNull().default("python"),
  sourceCode: text("source_code").notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  passedCount: integer("passed_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
  score: decimal("score", { precision: 10, scale: 2 }).notNull().default("0"),
  runtimeMs: integer("runtime_ms"),
  memoryKb: integer("memory_kb"),
  errorMessage: text("error_message"),
  isRanked: boolean("is_ranked").notNull().default(true),
  latestRunId: uuid("latest_run_id")
    .notNull()
    .references((): AnyPgColumn => submissionRuns.id),
  latestScoredRunId: uuid("latest_scored_run_id").references(
    (): AnyPgColumn => submissionRuns.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
}, (table) => ({
  userCreatedAtIdx: index("submissions_user_created_at_idx").on(table.userId, table.createdAt),
  questionCreatedAtIdx: index("submissions_question_created_at_idx").on(table.questionId, table.createdAt),
  createdAtIdx: index("submissions_created_at_idx").on(table.createdAt),
  rankedQuestionIdx: index("submissions_ranked_question_idx").on(
    table.userId,
    table.questionId,
    table.isRanked,
    table.createdAt,
  ),
}));

export const submissionRuns = pgTable("submission_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  trigger: varchar("trigger", { length: 20 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("queued"),
  passedCount: integer("passed_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
  score: decimal("score", { precision: 10, scale: 2 }).notNull().default("0"),
  runtimeMs: integer("runtime_ms"),
  memoryKb: integer("memory_kb"),
  errorMessage: text("error_message"),
  requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: false }),
  completedAt: timestamp("completed_at", { withTimezone: false }),
}, (table) => ({
  submissionSequenceUnique: uniqueIndex("submission_runs_submission_sequence_unique").on(
    table.submissionId,
    table.sequence,
  ),
  submissionCreatedAtIdx: index("submission_runs_submission_created_at_idx").on(
    table.submissionId,
    table.createdAt,
    table.id,
  ),
  triggerCheck: check("submission_runs_trigger_check", sql`${table.trigger} in ('official', 'rejudge')`),
}));

export const testcaseResults = pgTable("testcase_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionRunId: uuid("submission_run_id")
    .notNull()
    .references(() => submissionRuns.id, { onDelete: "cascade" }),
  testcaseId: uuid("testcase_id").references(() => testcases.id, { onDelete: "set null" }),
  testcaseName: varchar("testcase_name", { length: 255 }),
  testcaseSortOrder: integer("testcase_sort_order").notNull().default(0),
  isHidden: boolean("is_hidden").notNull().default(true),
  status: varchar("status", { length: 30 }).notNull(),
  actualOutput: text("actual_output"),
  expectedOutput: text("expected_output"),
  errorMessage: text("error_message"),
  runtimeMs: integer("runtime_ms"),
  memoryKb: integer("memory_kb"),
  passed: boolean("passed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
}, (table) => ({
  runSortIdx: index("testcase_results_run_sort_idx").on(
    table.submissionRunId,
    table.testcaseSortOrder,
    table.id,
  ),
  runTestcaseUnique: uniqueIndex("testcase_results_run_testcase_unique").on(
    table.submissionRunId,
    table.testcaseId,
  ),
}));

export const questionScores = pgTable(
  "question_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    bestSubmissionId: uuid("best_submission_id").references(() => submissions.id),
    bestScore: decimal("best_score", { precision: 10, scale: 2 }).notNull().default("0"),
    attempts: integer("attempts").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    userQuestionUnique: uniqueIndex("question_scores_user_question_unique").on(
      table.userId,
      table.questionId,
    ),
  }),
);

export const rejudgeJobs = pgTable("rejudge_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references((): AnyPgColumn => workspaces.id, { onDelete: "cascade" }),
  submissionId: uuid("submission_id").references(() => submissions.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade" }),
  requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 30 }).notNull().default("queued"),
  totalCount: integer("total_count").notNull().default(0),
  completedCount: integer("completed_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: false }),
  completedAt: timestamp("completed_at", { withTimezone: false }),
}, (table) => ({
  workspaceCreatedAtIdx: index("rejudge_jobs_workspace_created_at_idx").on(
    table.workspaceId,
    table.createdAt,
    table.id,
  ),
  targetCheck: check(
    "rejudge_jobs_target_check",
    sql`num_nonnulls(${table.submissionId}, ${table.questionId}) = 1`,
  ),
  statusCheck: check(
    "rejudge_jobs_status_check",
    sql`${table.status} in ('queued', 'running', 'completed', 'failed')`,
  ),
}));

export const gradingJobs = pgTable("grading_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  submissionRunId: uuid("submission_run_id")
    .notNull()
    .references(() => submissionRuns.id, { onDelete: "cascade" }),
  rejudgeJobId: uuid("rejudge_job_id").references(() => rejudgeJobs.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  lockedBy: varchar("locked_by", { length: 255 }),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: false }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: false }),
  completedAt: timestamp("completed_at", { withTimezone: false }),
}, (table) => ({
  runIdx: index("grading_jobs_submission_run_idx").on(table.submissionRunId),
  submissionCreatedAtIdx: index("grading_jobs_submission_created_at_idx").on(table.submissionId, table.createdAt),
  rejudgeIdx: index("grading_jobs_rejudge_idx").on(table.rejudgeJobId, table.createdAt),
  statusCreatedAtIdx: index("grading_jobs_status_created_at_idx").on(table.status, table.createdAt),
  leaseIdx: index("grading_jobs_lease_idx").on(table.status, table.leaseExpiresAt, table.createdAt),
}));

export const sandboxJobs = pgTable("sandbox_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  requestedBy: uuid("requested_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 30 }).notNull(),
  language: varchar("language", { length: 50 }).notNull(),
  sourceCode: text("source_code"),
  status: varchar("status", { length: 30 }).notNull().default("queued"),
  result: jsonb("result").$type<Record<string, unknown> | null>(),
  attempts: integer("attempts").notNull().default(0),
  lockedBy: varchar("locked_by", { length: 255 }),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: false }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: false }),
  completedAt: timestamp("completed_at", { withTimezone: false }),
  expiresAt: timestamp("expires_at", { withTimezone: false }).notNull(),
}, (table) => ({
  statusLeaseCreatedIdx: index("sandbox_jobs_status_lease_created_idx").on(
    table.status,
    table.leaseExpiresAt,
    table.createdAt,
  ),
  requesterCreatedIdx: index("sandbox_jobs_requester_created_idx").on(table.requestedBy, table.createdAt),
  statusExpiresIdx: index("sandbox_jobs_status_expires_idx").on(table.status, table.expiresAt),
  kindCheck: check("sandbox_jobs_kind_check", sql`${table.kind} in ('sample', 'compiler_diagnostics')`),
  statusCheck: check(
    "sandbox_jobs_status_check",
    sql`${table.status} in ('queued', 'running', 'completed', 'failed', 'cancelled')`,
  ),
}));

export const customCheckers = pgTable("custom_checkers", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  language: varchar("language", { length: 50 }).notNull().default("python"),
  sourceCode: text("source_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    count: integer("count").notNull().default(1),
    windowStart: timestamp("window_start", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    identifierActionWindowUnique: uniqueIndex("rate_limits_identifier_action_window_unique").on(
      table.identifier,
      table.action,
      table.windowStart,
    ),
  }),
);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  inviteCode: varchar("invite_code", { length: 50 }).notNull().unique(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("student"),
    joinedAt: timestamp("joined_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceUserUnique: uniqueIndex("workspace_members_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
    roleCheck: check("workspace_members_role_check", sql`${table.role} in ('student', 'ta')`),
    workspaceJoinedIdx: index("workspace_members_workspace_joined_idx").on(
      table.workspaceId,
      table.joinedAt,
      table.id,
    ),
  }),
);

export const supportedLanguages = pgTable("supported_languages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  dockerImage: varchar("docker_image", { length: 255 }).notNull(),
  fileExtension: varchar("file_extension", { length: 20 }).notNull(),
  buildCommand: text("build_command"),
  runCommand: text("run_command").notNull(),
  editorLanguage: varchar("editor_language", { length: 50 }).notNull().default("plaintext"),
  diagnosticsFormat: varchar("diagnostics_format", { length: 30 }).notNull().default("none"),
  diagnosticsCommand: text("diagnostics_command"),
  defaultStarterCode: text("default_starter_code"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  runtimeStatus: varchar("runtime_status", { length: 20 }).notNull().default("pending"),
  runtimeCheckedAt: timestamp("runtime_checked_at", { withTimezone: false }),
  runtimeError: text("runtime_error"),
});

export const usersRelations = relations(users, ({ many }) => ({
  questions: many(questions),
  submissions: many(submissions),
  requestedSubmissionRuns: many(submissionRuns),
  questionScores: many(questionScores),
  rejudgeJobs: many(rejudgeJobs),
  workspaceMembers: many(workspaceMembers),
  workspacesCreated: many(workspaces),
  passwordResetTokens: many(passwordResetTokens),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const idempotencyKeysRelations = relations(idempotencyKeys, () => ({}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [questions.workspaceId], references: [workspaces.id] }),
  author: one(users, { fields: [questions.createdBy], references: [users.id] }),
  testcases: many(testcases),
  submissions: many(submissions),
  questionScores: many(questionScores),
  rejudgeJobs: many(rejudgeJobs),
  customCheckers: many(customCheckers),
}));

export const testcasesRelations = relations(testcases, ({ one, many }) => ({
  question: one(questions, { fields: [testcases.questionId], references: [questions.id] }),
  results: many(testcaseResults),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  user: one(users, { fields: [submissions.userId], references: [users.id] }),
  question: one(questions, { fields: [submissions.questionId], references: [questions.id] }),
  runs: many(submissionRuns, { relationName: "submission_runs" }),
  latestRun: one(submissionRuns, {
    relationName: "submission_latest_run",
    fields: [submissions.latestRunId],
    references: [submissionRuns.id],
  }),
  latestScoredRun: one(submissionRuns, {
    relationName: "submission_latest_scored_run",
    fields: [submissions.latestScoredRunId],
    references: [submissionRuns.id],
  }),
  gradingJobs: many(gradingJobs),
}));

export const submissionRunsRelations = relations(submissionRuns, ({ one, many }) => ({
  submission: one(submissions, {
    relationName: "submission_runs",
    fields: [submissionRuns.submissionId],
    references: [submissions.id],
  }),
  requester: one(users, {
    fields: [submissionRuns.requestedBy],
    references: [users.id],
  }),
  testcaseResults: many(testcaseResults),
  gradingJobs: many(gradingJobs),
}));

export const testcaseResultsRelations = relations(testcaseResults, ({ one }) => ({
  submissionRun: one(submissionRuns, {
    fields: [testcaseResults.submissionRunId],
    references: [submissionRuns.id],
  }),
  testcase: one(testcases, {
    fields: [testcaseResults.testcaseId],
    references: [testcases.id],
  }),
}));

export const questionScoresRelations = relations(questionScores, ({ one }) => ({
  user: one(users, { fields: [questionScores.userId], references: [users.id] }),
  question: one(questions, { fields: [questionScores.questionId], references: [questions.id] }),
  bestSubmission: one(submissions, {
    fields: [questionScores.bestSubmissionId],
    references: [submissions.id],
  }),
}));

export const gradingJobsRelations = relations(gradingJobs, ({ one }) => ({
  submission: one(submissions, {
    fields: [gradingJobs.submissionId],
    references: [submissions.id],
  }),
  submissionRun: one(submissionRuns, {
    fields: [gradingJobs.submissionRunId],
    references: [submissionRuns.id],
  }),
  rejudgeJob: one(rejudgeJobs, {
    fields: [gradingJobs.rejudgeJobId],
    references: [rejudgeJobs.id],
  }),
}));

export const sandboxJobsRelations = relations(sandboxJobs, ({ one }) => ({
  workspace: one(workspaces, { fields: [sandboxJobs.workspaceId], references: [workspaces.id] }),
  question: one(questions, { fields: [sandboxJobs.questionId], references: [questions.id] }),
  requester: one(users, { fields: [sandboxJobs.requestedBy], references: [users.id] }),
}));

export const rejudgeJobsRelations = relations(rejudgeJobs, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [rejudgeJobs.workspaceId],
    references: [workspaces.id],
  }),
  submission: one(submissions, {
    fields: [rejudgeJobs.submissionId],
    references: [submissions.id],
  }),
  question: one(questions, {
    fields: [rejudgeJobs.questionId],
    references: [questions.id],
  }),
  requester: one(users, {
    fields: [rejudgeJobs.requestedBy],
    references: [users.id],
  }),
  gradingJobs: many(gradingJobs),
}));

export const customCheckersRelations = relations(customCheckers, ({ one }) => ({
  question: one(questions, {
    fields: [customCheckers.questionId],
    references: [questions.id],
  }),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  creator: one(users, {
    fields: [workspaces.createdBy],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  questions: many(questions),
  rejudgeJobs: many(rejudgeJobs),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const touchUpdatedAt = sql`now()`;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type Testcase = typeof testcases.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type SubmissionRun = typeof submissionRuns.$inferSelect;
export type TestcaseResult = typeof testcaseResults.$inferSelect;
export type QuestionScore = typeof questionScores.$inferSelect;
export type GradingJob = typeof gradingJobs.$inferSelect;
export type SandboxJob = typeof sandboxJobs.$inferSelect;
export type SupportedLanguage = typeof supportedLanguages.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
