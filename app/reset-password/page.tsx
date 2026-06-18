import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Reset Password | Codetice",
  description: "Reset your account password with a one-time reset link.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/settings");
  }

  const resolvedSearchParams = await searchParams;
  const initialToken = Array.isArray(resolvedSearchParams.token)
    ? resolvedSearchParams.token[0] ?? ""
    : resolvedSearchParams.token ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Codetice</h1>
        </div>

        <ResetPasswordForm initialToken={initialToken} />
      </div>
    </div>
  );
}
