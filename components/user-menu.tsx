"use client";

import NextImage from "next/image";
import Link from "next/link";
import { Settings, Shield, Languages, Users } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/common/button";
import type { SessionUser } from "@/lib/types";

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          tooltip="Open user menu"
          aria-label="Open user menu"
          variant="ghost"
          className="h-auto rounded-full bg-[#f5f5f7] p-1 pl-[14px] transition-all hover:bg-[#e8e8ec] dark:bg-[#121318] dark:hover:bg-[#1c1d22]"
        >
          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[100px] leading-normal select-none">
            {user.username}
          </span>
          <div className="h-[32px] w-[32px] rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-black/5 dark:border-white/10">
            <NextImage
              src={user.profilePicture || "/avatars/avatar-1.png"}
              alt={user.username}
              width={32}
              height={32}
              unoptimized
              className="h-full w-full object-cover"
            />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width] min-w-[160px] mt-[2px]">
        {user.role === "admin" ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Users
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/languages">
                <Languages className="mr-2 h-4 w-4" />
                Languages
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
