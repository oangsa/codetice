import { AppError, ErrorCode, Messages } from "@/lib/errors";

export const DOCKER_IMAGE_PATTERN =
  /^(?=.{1,255}$)(?:[a-z0-9]+(?:[._-][a-z0-9]+)*(?::[0-9]{1,5})\/)?(?:[a-z0-9]+(?:(?:[._-]|__)[a-z0-9]+)*\/)*[a-z0-9]+(?:(?:[._-]|__)[a-z0-9]+)*(?::[A-Za-z0-9_][A-Za-z0-9_.-]{0,127})?(?:@sha256:[A-Fa-f0-9]{64})?$/;

export function validateDockerImage(image: string) {
  if (image !== image.trim() || image.startsWith("-") || /[\s;&|`$<>\\]/.test(image) || !DOCKER_IMAGE_PATTERN.test(image)) {
    throw new AppError(Messages.langInvalidImage, 400, ErrorCode.VALIDATION);
  }
}

export function buildDockerImageInspectArgs(image: string) {
  return ["image", "inspect", image];
}

export function buildDockerPullArgs(image: string) {
  return ["pull", image];
}
