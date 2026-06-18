"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

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

    try {
      // 1. Resize + compress to a small JPEG data URI on the client
      const dataUri = await resizeImage(file);

      // 2. Save the data URI directly as the profile picture
      const saveRes = await fetch("/api/me/profile-picture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePicture: dataUri }),
      });

      const saveData = (await saveRes.json()) as { message?: string };

      if (!saveRes.ok) {
        toast.error(saveData.message ?? "Failed to save profile picture.");
        return;
      }

      setAvatarUrl(dataUri);
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
