import "server-only";

import { prepareDockerImage } from "@/server/languages/docker-image-service";
import { prepareLanguageRuntime } from "@/server/languages/runtime-preparation";
import {
  markLanguageRuntimeError,
  markLanguageRuntimeReady,
} from "@/server/languages/service";

export function prepareEnabledLanguageRuntime(language: { id: string; dockerImage: string }) {
  return prepareLanguageRuntime(language, {
    prepareImage: prepareDockerImage,
    markReady: markLanguageRuntimeReady,
    markError: markLanguageRuntimeError,
  });
}
