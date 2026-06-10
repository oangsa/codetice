import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <AuthForm
        title="Login"
        description="Use your local account to access questions, submissions, and admin tools."
        endpoint="/api/auth/login"
        submitLabel="Login"
      />
      <p className="text-center text-sm text-slate-500">
        Need an account?{" "}
        <Link href="/register" className="font-medium text-sky-700 hover:text-sky-800">
          Register
        </Link>
      </p>
    </div>
  );
}
