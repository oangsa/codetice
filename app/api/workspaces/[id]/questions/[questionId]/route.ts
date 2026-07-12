import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { questionSchema } from "@/modules/questions/schema";
import { AppError, ErrorCode } from "@/lib/errors";
import { requireWorkspaceMember, requireWorkspaceStaff } from "@/server/workspaces/authorization";
import {
  deleteWorkspaceQuestion,
  updateWorkspaceQuestion,
} from "@/server/questions/mutations";
import { getWorkspaceQuestionById } from "@/server/questions/queries";

export async function GET(_request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, questionId } = await context.params;
    const access = await requireWorkspaceMember(actor, workspaceId);
    const question = await getWorkspaceQuestionById(workspaceId, questionId);
    if (!question || (!access.staff && !question.isPublished)) {
      throw new AppError(Messages.questionNotFound, 404, ErrorCode.NOT_FOUND);
    }
    return ok({
      question: {
        id: question.id,
        title: question.title,
        slug: question.slug,
        description: question.description,
        difficulty: question.difficulty,
        totalScore: question.totalScore,
        timeLimitMs: question.timeLimitMs,
        memoryLimitMb: question.memoryLimitMb,
        starterCode: question.starterCode,
        starterCodeByLanguage: question.starterCodeByLanguage,
        allowedLanguages: question.allowedLanguages,
        isPublished: question.isPublished,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
      },
    });
  } catch (error) {
    return toFailResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, questionId } = await context.params;
    await requireWorkspaceStaff(actor, workspaceId);
    const body = questionSchema.parse(await request.json());
    return ok({ question: await updateWorkspaceQuestion(workspaceId, questionId, body) });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToUpdateQuestion);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id: workspaceId, questionId } = await context.params;
    await requireWorkspaceStaff(actor, workspaceId);
    await deleteWorkspaceQuestion(workspaceId, questionId);
    return ok({ message: "Question deleted." });
  } catch (error) {
    return toFailResponse(error, Messages.unableToDeleteQuestion);
  }
}
