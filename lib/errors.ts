export { ErrorCode, Messages } from "@/lib/api.constants";
import { ErrorCode, Messages } from "@/lib/api.constants";

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  constructor(message: string, status = 400, code: ErrorCode = ErrorCode.VALIDATION) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export class RateLimitError extends AppError {
  constructor(message = Messages.rateLimited) {
    super(message, 429, ErrorCode.RATE_LIMITED);
    this.name = "RateLimitError";
  }
}

export function toErrorInfo(error: unknown, fallback: string = Messages.somethingWrong) {
  if (error instanceof AppError) {
    return { message: error.message, status: error.status, code: error.code };
  }
  return { message: fallback, status: 500, code: ErrorCode.INTERNAL };
}
