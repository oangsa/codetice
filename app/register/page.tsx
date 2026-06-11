import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth";

export default async function RegisterPage() {
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
          title="Register"
          description=""
          endpoint="/api/auth/register"
          submitLabel="Create account"
        />

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-700">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
