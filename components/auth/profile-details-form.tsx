"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SessionUser } from "@/lib/types";

// Resize and compress an image File to a JPEG data URI (max 128x128px)
function resizeImage(file: File, maxPx = 128, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function ProfileDetailsForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(user.username);
  const [avatarUrl, setAvatarUrl] = useState(user.profilePicture || "/avatars/avatar-1.png");
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialAvatar = user.profilePicture || "/avatars/avatar-1.png";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maximum file size is 5MB.");
      return;
    }

    setUploading(true);

    try {
      // Resize + compress client-side, store as data URI (no file upload needed)
      const dataUri = await resizeImage(file);
      setAvatarUrl(dataUri);
      toast.success("Avatar ready. Click Save Changes to apply permanently.");
    } catch {
      toast.error("An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const usernameChanged = username !== user.username;
    const avatarChanged = avatarUrl !== initialAvatar;

    if (!usernameChanged && !avatarChanged) {
      toast.info("No changes to save.");
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setError("Username must be between 3 and 20 characters.");
      return;
    }

    setPending(true);

    try {
      // 1. Save username if changed
      if (usernameChanged) {
        const response = await fetch("/api/me/username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        const data = (await response.json()) as { message?: string };
        if (!response.ok) {
          setError(data.message ?? "Failed to update username.");
          setPending(false);
          return;
        }
      }

      // 2. Save profile picture if changed
      if (avatarChanged) {
        const saveRes = await fetch("/api/me/profile-picture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profilePicture: avatarUrl }),
        });

        const saveData = (await saveRes.json()) as { message?: string };
        if (!saveRes.ok) {
          setError(saveData.message ?? "Failed to save profile picture.");
          setPending(false);
          return;
        }
      }

      toast.success("Profile details saved successfully.");
      router.refresh();
    } catch {
      setError("An unexpected error occurred while saving.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Avatar Selector and Preview */}
        <div className="relative shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="relative h-20 w-20 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
            <div className="h-full w-full rounded-full overflow-hidden">
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                className="h-full w-full object-cover"
              />
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || pending}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Username Text Box and Role Display */}
        <div className="flex-grow space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <label htmlFor="username-input" className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Username
              </label>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {user.role}
              </span>
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <Input
                id="username-input"
                name="username"
                type="text"
                placeholder="Enter username"
                className="pl-9 h-10 rounded-xl"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                disabled={pending}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Unified Save Button */}
      <div className="flex justify-end border-t border-slate-800/80 dark:border-slate-100 pt-4 mt-2">
        <Button
          type="submit"
          disabled={pending || (username === user.username && avatarUrl === initialAvatar)}
          className="gap-1.5 shadow-sm hover:shadow transition-all rounded-xl px-5 h-9"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
