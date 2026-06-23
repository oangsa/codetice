import type { NextRequest } from "next/server";

import { getSession } from "@/lib/auth";
import { ErrorCode, Messages, fail, ok } from "@/lib/api";
import {
  canUserEditQuestion,
  getQuestionById,
  listQuestionSubmissionsPage,
} from "@/server/services/question-service";

const DEFAULT_LIMIT = 20;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session) {
    return fail(Messages.unauthorized, 401, { code: ErrorCode.UNAUTHORIZED });
  }

  const { id } = await context.params;
  const question = await getQuestionById(id);

  if (!question) {
    return fail(Messages.questionNotFound, 404, { code: ErrorCode.NOT_FOUND });
  }

  const canViewQuestion = question.isPublished || canUserEditQuestion(session, question);

  if (!canViewQuestion) {
    return fail(Messages.forbidden, 403, { code: ErrorCode.FORBIDDEN });
  }

  const limit = parsePositiveInt(request.nextUrl.searchParams.get("limit"), DEFAULT_LIMIT);
  const offset = parsePositiveInt(request.nextUrl.searchParams.get("offset"), 0);
  const page = await listQuestionSubmissionsPage(id, session.userId, { limit, offset });

  return ok(page);
}
