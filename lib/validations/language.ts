import { z } from "zod";
import { Messages } from "@/lib/api.constants";

const diagnosticsFormatSchema = z.enum(["none", "pyright", "compiler"]);

const supportedLanguageBaseSchema = z.object({
  name: z.string().trim().min(1, "Language name is required.").max(100, "Name is too long (max 100 characters)."),
  dockerImage: z.string().trim().min(1, "Docker image is required.").max(255, "Docker image name is too long (max 255 characters)."),
  fileExtension: z
    .string()
    .trim()
    .min(1, "File extension is required.")
    .max(20, "File extension is too long (max 20 characters).")
    .regex(/^[a-z0-9]+$/, "File extension must be alphanumeric."),
  runCommand: z.string().trim().min(1, "Run command is required.").max(500, "Run command is too long (max 500 characters)."),
  editorLanguage: z
    .string()
    .trim()
    .min(1, "Editor language is required.")
    .max(50, "Editor language is too long (max 50 characters).")
    .regex(/^[a-z0-9_#+-]+$/, "Editor language must be a Monaco language id.")
    .default("plaintext"),
  diagnosticsFormat: diagnosticsFormatSchema.default("none"),
  diagnosticsCommand: z.string().trim().max(500).optional().nullable(),
  defaultStarterCode: z.string().optional().nullable(),
  isEnabled: z.boolean().default(true),
});

function validateDiagnosticsCommand(
  value: {
    diagnosticsFormat?: z.infer<typeof diagnosticsFormatSchema>;
    diagnosticsCommand?: string | null;
  },
  ctx: z.RefinementCtx
) {
  if (value.diagnosticsFormat === "compiler" && !value.diagnosticsCommand) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: Messages.langDiagnosticsCommandRequired,
      path: ["diagnosticsCommand"],
    });
  }
}

export const supportedLanguageSchema = supportedLanguageBaseSchema.superRefine(
  validateDiagnosticsCommand
);

export const updateSupportedLanguageSchema = supportedLanguageBaseSchema
  .superRefine(validateDiagnosticsCommand);
