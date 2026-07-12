import { AppError, ErrorCode, Messages } from "@/lib/errors";

export function getConfiguredAppUrl() {
  const configuredUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredUrl) {
    throw new AppError(Messages.unableToGenerateResetLink, 500, ErrorCode.INTERNAL);
  }

  try {
    const url = new URL(configuredUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Unsupported app URL protocol.");
    }
    return url;
  } catch {
    throw new AppError(Messages.unableToGenerateResetLink, 500, ErrorCode.INTERNAL);
  }
}

export function createAppUrl(pathname: string) {
  return new URL(pathname, getConfiguredAppUrl());
}
