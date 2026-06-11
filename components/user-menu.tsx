"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/types";

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function handleLogout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      toast.error("Unable to log out.");
      return;
    }
    toast.success("Logged out.");
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 rounded-md border border-slate-200 px-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50">
          <span className="hidden text-sm font-medium md:inline">{user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
