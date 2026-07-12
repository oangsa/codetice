import "server-only";

import { and, eq } from "drizzle-orm";

import { questions } from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";

export async function assertQuestionParent(workspaceId: string, questionId: string) {
  const db = getDb();
  const question = await db.query.questions.findFirst({
    where: and(eq(questions.workspaceId, workspaceId), eq(questions.id, questionId)),
    columns: { id: true },
  });
  if (!question) throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
}
