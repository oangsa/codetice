import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/modules/auth/components/auth-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/workspaces");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center select-none">
          <Image src="/icon.png" alt="Codetice" width={96} height={96} className="h-24 w-24 object-contain" priority />
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Codetice</h1>
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
