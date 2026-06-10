import { relations, sql } from "drizzle-orm";
import {
  boolean,
  decimal,
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
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description").notNull(),
  difficulty: varchar("difficulty", { length: 20 }).notNull().default("easy"),
  totalScore: decimal("total_score", { precision: 10, scale: 2 }).notNull().default("100"),
  timeLimitMs: integer("time_limit_ms").notNull().default(2000),
  memoryLimitMb: integer("memory_limit_mb").notNull().default(128),
  starterCode: text("starter_code"),
  isPublished: boolean("is_published").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
});

export const testcases = pgTable("testcases", {
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
});

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
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

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
});

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
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: false }),
  completedAt: timestamp("completed_at", { withTimezone: false }),
});

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

export const usersRelations = relations(users, ({ many }) => ({
  questions: many(questions),
  submissions: many(submissions),
  questionScores: many(questionScores),
  rejudgeJobs: many(rejudgeJobs),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
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

export const touchUpdatedAt = sql`now()`;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type Testcase = typeof testcases.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type TestcaseResult = typeof testcaseResults.$inferSelect;
export type QuestionScore = typeof questionScores.$inferSelect;
export type GradingJob = typeof gradingJobs.$inferSelect;
