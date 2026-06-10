import Link from "next/link";
import { redirect } from "next/navigation";
import { Code2 } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Code2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vibe Grader</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to your account</p>
        </div>

        <AuthForm
          title="Login"
          description="Use your local account to access questions, submissions, and admin tools."
          endpoint="/api/auth/login"
          submitLabel="Sign in"
        />

        <p className="mt-6 text-center text-sm text-slate-500">
          Need an account?{" "}
          <Link href="/register" className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-700">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
