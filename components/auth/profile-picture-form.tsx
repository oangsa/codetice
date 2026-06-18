"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

export function ProfilePictureForm({ initialAvatar }: { initialAvatar: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [uploading, setUploading] = useState(false);

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

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Upload image from device
      const uploadRes = await fetch("/api/me/upload-avatar", {
        method: "POST",
        body: formData,
      });

      const uploadData = (await uploadRes.json()) as { message?: string; url?: string };

      if (!uploadRes.ok || !uploadData.url) {
        toast.error(uploadData.message ?? "Failed to upload image.");
        return;
      }

      // 2. Automatically save the new profile picture URL to the user profile
      const saveRes = await fetch("/api/me/profile-picture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePicture: uploadData.url }),
      });

      const saveData = (await saveRes.json()) as { message?: string };

      if (!saveRes.ok) {
        toast.error(saveData.message ?? "Failed to save profile picture.");
        return;
      }

      setAvatarUrl(uploadData.url);
      toast.success("Profile picture updated successfully.");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {/* Current Avatar display */}
      <div className="relative h-24 w-24 rounded-full border border-slate-200 shadow-sm bg-slate-50 flex items-center justify-center shrink-0">
        <div className="h-full w-full rounded-full overflow-hidden">
          <img
            src={avatarUrl}
            alt="Profile Avatar"
            className="h-full w-full object-cover"
          />
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
        
        {/* Pen Button (Circle at bottom right) */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
