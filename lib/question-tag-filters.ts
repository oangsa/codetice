import { AppError, ErrorCode, Messages } from "@/lib/errors";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseQuestionTagIds(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 16 || value.some((tagId) => typeof tagId !== "string" || !UUID_PATTERN.test(tagId))) {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
  const tagIds = [...new Set(value)].sort();
  if (tagIds.length !== value.length) {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
  return tagIds;
}
