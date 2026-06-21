import { z } from "zod";

const diagnosticsFormatSchema = z.enum(["none", "pyright", "compiler"]);

const supportedLanguageBaseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  dockerImage: z.string().trim().min(1).max(255),
  fileExtension: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .regex(/^[a-z0-9]+$/, "File extension must be alphanumeric."),
  runCommand: z.string().trim().min(1).max(500),
  editorLanguage: z
    .string()
    .trim()
    .min(1)
    .max(50)
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
      message: "Diagnostics command is required when diagnostics format is compiler.",
      path: ["diagnosticsCommand"],
    });
  }
}

export const supportedLanguageSchema = supportedLanguageBaseSchema.superRefine(
  validateDiagnosticsCommand
);

export const updateSupportedLanguageSchema = supportedLanguageBaseSchema
  .superRefine(validateDiagnosticsCommand);
