import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(8).max(100),
});

export const loginSchema = registerSchema;

const passwordSchema = z.string().min(8).max(100);

export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const adminResetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const resetPasswordWithTokenSchema = z
  .object({
    token: z.string().trim().min(1).max(255),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
