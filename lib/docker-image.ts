import { AppError, ErrorCode, Messages } from "@/lib/errors";

export const DOCKER_IMAGE_PATTERN =
  /^[a-z0-9]+(?:(?:[._-]|__)[a-z0-9]+)*(?:\/[a-z0-9]+(?:(?:[._-]|__)[a-z0-9]+)*)*(?::[A-Za-z0-9_.-]+)?(?:@[A-Za-z][A-Za-z0-9]*(?:[+._-][A-Za-z][A-Za-z0-9]*)*:[A-Fa-f0-9]{32,})?$/;

export function validateDockerImage(image: string) {
  if (!DOCKER_IMAGE_PATTERN.test(image)) {
    throw new AppError(Messages.langInvalidImage, 400, ErrorCode.VALIDATION);
  }
}

export function buildDockerImageInspectArgs(image: string) {
  return ["image", "inspect", image];
}

export function buildDockerPullArgs(image: string) {
  return ["pull", image];
}
