export type LanguageRuntimeIdentity = {
  id: string;
  dockerImage: string;
};

export type PreparedDockerImage = {
  image: string;
  output: string;
  pulled: boolean;
};

export type RuntimePreparationDependencies = {
  prepareImage: (image: string) => Promise<PreparedDockerImage>;
  markReady: (id: string, dockerImage: string) => Promise<void>;
  markError: (id: string, dockerImage: string, error: string) => Promise<void>;
};

export async function prepareLanguageRuntime(
  language: LanguageRuntimeIdentity,
  dependencies: RuntimePreparationDependencies,
) {
  try {
    const result = await dependencies.prepareImage(language.dockerImage);
    await dependencies.markReady(language.id, language.dockerImage);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Docker image preparation failed.";
    await dependencies.markError(language.id, language.dockerImage, message);
    throw error;
  }
}
