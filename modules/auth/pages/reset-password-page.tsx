import Image from "next/image";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form";
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
        <div className="mb-8 flex flex-col items-center gap-3 text-center select-none">
          <Image src="/icon.png" alt="Codetice" width={96} height={96} className="h-24 w-24 object-contain" priority />
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Codetice</h1>
        </div>

        <ResetPasswordForm initialToken={initialToken} />
      </div>
    </div>
  );
}
