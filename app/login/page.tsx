import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/classrooms");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Codetice</h1>
        </div>

        <AuthForm
          title="Login"
          description=""
          endpoint="/api/auth/login"
          submitLabel="Sign in"
        />

        <p className="mt-6 text-center text-sm text-slate-500">
          Have a reset link?{" "}
          <Link href="/reset-password" className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-700">
            Reset password
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-slate-500">
          Need an account?{" "}
          <Link href="/register" className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-700">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
