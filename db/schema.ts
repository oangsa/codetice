import { relations, sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("student"),
  profilePicture: text("profile_picture").default("/avatars/avatar-1.png").notNull(),
  tokenVersion: integer("token_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
});

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
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
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
    publishedCreatedAtIdx: index("questions_published_created_at_idx").on(table.isPublished, table.createdAt),
    createdAtIdx: index("questions_created_at_idx").on(table.createdAt),
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
  assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: "set null" }),
  language: varchar("language", { length: 50 }).notNull().default("python"),
  sourceCode: text("source_code").notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  passedCount: integer("passed_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
  score: decimal("score", { precision: 10, scale: 2 }).notNull().default("0"),
  runtimeMs: integer("runtime_ms"),
  memoryKb: integer("memory_kb"),
  errorMessage: text("error_message"),
  isLate: boolean("is_late").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
}, (table) => ({
  userCreatedAtIdx: index("submissions_user_created_at_idx").on(table.userId, table.createdAt),
  questionCreatedAtIdx: index("submissions_question_created_at_idx").on(table.questionId, table.createdAt),
  createdAtIdx: index("submissions_created_at_idx").on(table.createdAt),
}));

export const testcaseResults = pgTable("testcase_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  testcaseId: uuid("testcase_id")
    .notNull()
    .references(() => testcases.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).notNull(),
  actualOutput: text("actual_output"),
  expectedOutput: text("expected_output"),
  errorMessage: text("error_message"),
  runtimeMs: integer("runtime_ms"),
  memoryKb: integer("memory_kb"),
  passed: boolean("passed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
}, (table) => ({
  submissionIdx: index("testcase_results_submission_idx").on(table.submissionId),
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

export const gradingJobs = pgTable("grading_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  lockedBy: varchar("locked_by", { length: 255 }),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: false }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: false }),
  completedAt: timestamp("completed_at", { withTimezone: false }),
}, (table) => ({
  submissionCreatedAtIdx: index("grading_jobs_submission_created_at_idx").on(table.submissionId, table.createdAt),
  statusCreatedAtIdx: index("grading_jobs_status_created_at_idx").on(table.status, table.createdAt),
  leaseIdx: index("grading_jobs_lease_idx").on(table.status, table.leaseExpiresAt, table.createdAt),
}));

export const rejudgeJobs = pgTable("rejudge_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade" }),
  requestedBy: uuid("requested_by").references(() => users.id),
  status: varchar("status", { length: 30 }).notNull().default("queued"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: false }),
});

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

export const leaderboards = pgTable(
  "leaderboards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    totalScore: decimal("total_score", { precision: 10, scale: 2 }).notNull().default("0"),
    solvedCount: integer("solved_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    userUnique: uniqueIndex("leaderboards_user_unique").on(table.userId),
  }),
);

export const classrooms = pgTable("classrooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  inviteCode: varchar("invite_code", { length: 50 }).notNull().unique(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

export const classroomMembers = pgTable(
  "classroom_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classroomId: uuid("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("student"),
    joinedAt: timestamp("joined_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    classroomUserUnique: uniqueIndex("classroom_members_classroom_user_unique").on(
      table.classroomId,
      table.userId,
    ),
  }),
);

export const assignments = pgTable("assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id").references(() => classrooms.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startAt: timestamp("start_at", { withTimezone: false }),
  dueAt: timestamp("due_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

export const assignmentQuestions = pgTable(
  "assignment_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => ({
    assignmentQuestionUnique: uniqueIndex("assignment_questions_assignment_question_unique").on(
      table.assignmentId,
      table.questionId,
    ),
  }),
);

export const supportedLanguages = pgTable("supported_languages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  dockerImage: varchar("docker_image", { length: 255 }).notNull(),
  fileExtension: varchar("file_extension", { length: 20 }).notNull(),
  runCommand: text("run_command").notNull(),
  editorLanguage: varchar("editor_language", { length: 50 }).notNull().default("plaintext"),
  diagnosticsFormat: varchar("diagnostics_format", { length: 30 }).notNull().default("none"),
  diagnosticsCommand: text("diagnostics_command"),
  defaultStarterCode: text("default_starter_code"),
  isEnabled: boolean("is_enabled").notNull().default(true),
});

export const usersRelations = relations(users, ({ many }) => ({
  questions: many(questions),
  submissions: many(submissions),
  questionScores: many(questionScores),
  rejudgeJobs: many(rejudgeJobs),
  leaderboardEntries: many(leaderboards),
  classroomMembers: many(classroomMembers),
  classroomsCreated: many(classrooms),
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
  author: one(users, { fields: [questions.createdBy], references: [users.id] }),
  testcases: many(testcases),
  submissions: many(submissions),
  questionScores: many(questionScores),
  rejudgeJobs: many(rejudgeJobs),
  customCheckers: many(customCheckers),
  assignmentQuestions: many(assignmentQuestions),
}));

export const testcasesRelations = relations(testcases, ({ one, many }) => ({
  question: one(questions, { fields: [testcases.questionId], references: [questions.id] }),
  results: many(testcaseResults),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  user: one(users, { fields: [submissions.userId], references: [users.id] }),
  question: one(questions, { fields: [submissions.questionId], references: [questions.id] }),
  assignment: one(assignments, { fields: [submissions.assignmentId], references: [assignments.id] }),
  testcaseResults: many(testcaseResults),
  gradingJobs: many(gradingJobs),
}));

export const testcaseResultsRelations = relations(testcaseResults, ({ one }) => ({
  submission: one(submissions, {
    fields: [testcaseResults.submissionId],
    references: [submissions.id],
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
}));

export const rejudgeJobsRelations = relations(rejudgeJobs, ({ one }) => ({
  question: one(questions, {
    fields: [rejudgeJobs.questionId],
    references: [questions.id],
  }),
  requester: one(users, {
    fields: [rejudgeJobs.requestedBy],
    references: [users.id],
  }),
}));

export const customCheckersRelations = relations(customCheckers, ({ one }) => ({
  question: one(questions, {
    fields: [customCheckers.questionId],
    references: [questions.id],
  }),
}));

export const leaderboardsRelations = relations(leaderboards, ({ one }) => ({
  user: one(users, {
    fields: [leaderboards.userId],
    references: [users.id],
  }),
}));

export const classroomsRelations = relations(classrooms, ({ one, many }) => ({
  creator: one(users, {
    fields: [classrooms.createdBy],
    references: [users.id],
  }),
  members: many(classroomMembers),
  assignments: many(assignments),
}));

export const classroomMembersRelations = relations(classroomMembers, ({ one }) => ({
  classroom: one(classrooms, {
    fields: [classroomMembers.classroomId],
    references: [classrooms.id],
  }),
  user: one(users, {
    fields: [classroomMembers.userId],
    references: [users.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  classroom: one(classrooms, {
    fields: [assignments.classroomId],
    references: [classrooms.id],
  }),
  assignmentQuestions: many(assignmentQuestions),
  submissions: many(submissions),
}));

export const assignmentQuestionsRelations = relations(assignmentQuestions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [assignmentQuestions.assignmentId],
    references: [assignments.id],
  }),
  question: one(questions, {
    fields: [assignmentQuestions.questionId],
    references: [questions.id],
  }),
}));

export const touchUpdatedAt = sql`now()`;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type Testcase = typeof testcases.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type TestcaseResult = typeof testcaseResults.$inferSelect;
export type QuestionScore = typeof questionScores.$inferSelect;
export type GradingJob = typeof gradingJobs.$inferSelect;
export type SupportedLanguage = typeof supportedLanguages.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
