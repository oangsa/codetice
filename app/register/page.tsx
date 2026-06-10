import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <AuthForm
        title="Register"
        description="Create a student account to solve questions and track your best score."
        endpoint="/api/auth/register"
        submitLabel="Create account"
      />
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-sky-700 hover:text-sky-800">
          Login
        </Link>
      </p>
    </div>
  );
}
