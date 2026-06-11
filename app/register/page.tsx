import Link from "next/link";
import { redirect } from "next/navigation";
import { Code2 } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) {
    redirect("/classrooms");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <Code2 className="h-7 w-7" />
          </div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Contest Workspace</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Create account</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Join Codetice to start solving problems and tracking best scores.</p>
        </div>

        <AuthForm
          title="Register"
          description="Create a student account to solve questions and track your best score."
          endpoint="/api/auth/register"
          submitLabel="Create account"
        />

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
