import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { validateAvatarFile } from "@/lib/avatar";
import Avatar from "./Avatar";

interface AvatarUploadControlProps {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  canManage: boolean;
  size?: number;
  onChanged?: (avatarUrl: string | null) => void;
}

function uploadFile(userId: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<{ avatarUrl: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `/api/users/${encodeURIComponent(userId)}/avatar`);
    request.withCredentials = true;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let body: { avatarUrl?: string; error?: unknown; message?: string } = {};
      try {
        body = JSON.parse(request.responseText) as typeof body;
      } catch {
        // A non-JSON error still receives a clear status fallback below.
      }
      if (request.status >= 200 && request.status < 300 && body.avatarUrl) {
        resolve({ avatarUrl: body.avatarUrl });
      } else {
        const message = typeof body.error === "string"
          ? body.error
          : typeof body.message === "string"
            ? body.message
            : `Image upload failed (${request.status}).`;
        reject(new Error(message));
      }
    };
    request.onerror = () => reject(new Error("Image upload failed. Check your connection and try again."));
    const formData = new FormData();
    formData.append("file", file);
    // Deliberately do not set Content-Type: the browser adds the multipart boundary.
    request.send(formData);
  });
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Could not update the profile image.";
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed.message === "string") return parsed.message;
  } catch {
    // The error was already plain text.
  }
  return error.message || "Could not update the profile image.";
}

export default function AvatarUploadControl({
  userId,
  name,
  avatarUrl,
  canManage,
  size = 64,
  onChanged,
}: AvatarUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [currentUrl, setCurrentUrl] = useState<string | null>(avatarUrl ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setCurrentUrl(avatarUrl ?? null), [avatarUrl]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const refreshAvatarSurfaces = async (nextUrl: string | null) => {
    setCurrentUrl(nextUrl);
    onChanged?.(nextUrl);
    if (authUser?.id === userId) setUser({ ...authUser, avatarUrl: nextUrl ?? undefined });
    // Avatars are canonical user data projected into partner, agency, team, and deal views.
    // A full cache invalidation prevents stale photos in any already-mounted projection.
    await queryClient.invalidateQueries();
  };

  const chooseFile = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setError(null);
    setProgress(0);
    setPending(true);
    try {
      const result = await uploadFile(userId, file, setProgress);
      await refreshAvatarSurfaces(result.avatarUrl);
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
    } catch (uploadError) {
      setError(errorMessage(uploadError));
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    setError(null);
    setPending(true);
    try {
      await api.delete<{ avatarUrl: null }>(`/users/${userId}/avatar`);
      await refreshAvatarSurfaces(null);
    } catch (removeError) {
      setError(errorMessage(removeError));
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <Avatar name={name} avatarUrl={previewUrl ?? currentUrl} size={size} />
        {canManage && (
          <button
            type="button"
            aria-label={`${currentUrl ? "Replace" : "Upload"} ${name}'s profile photo`}
            title={`${currentUrl ? "Replace" : "Upload"} profile image`}
            onClick={chooseFile}
            disabled={pending}
            className="group"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: 0,
              padding: 0,
              cursor: pending ? "wait" : "pointer",
              color: "#fff",
              background: "rgba(0,0,0,0.48)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: pending ? 1 : 0,
              transition: "opacity 150ms",
            }}
            onMouseEnter={(event) => { event.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(event) => { if (!pending) event.currentTarget.style.opacity = "0"; }}
            onFocus={(event) => { event.currentTarget.style.opacity = "1"; }}
            onBlur={(event) => { if (!pending) event.currentTarget.style.opacity = "0"; }}
          >
            <Camera aria-hidden="true" style={{ width: size * 0.32, height: size * 0.32 }} />
          </button>
        )}
        {pending && (
          <span
            aria-label={`Uploading profile image, ${progress}%`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            style={{
              position: "absolute",
              left: 4,
              right: 4,
              bottom: 5,
              height: 3,
              borderRadius: 2,
              overflow: "hidden",
              background: "rgba(255,255,255,0.4)",
            }}
          >
            <span style={{ display: "block", width: `${progress}%`, height: "100%", background: "#fff" }} />
          </span>
        )}
      </div>
      {canManage && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            hidden
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={chooseFile}
              disabled={pending}
              style={{ border: 0, background: "none", padding: 0, color: "var(--accent-primary)", fontSize: 11, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
            >
              {pending ? `Uploading ${progress}%` : currentUrl ? "Replace Image" : "Add Image"}
            </button>
            {currentUrl && !pending && (
              <button
                type="button"
                onClick={() => void remove()}
                aria-label={`Remove ${name}'s profile photo`}
                title="Remove profile image"
                style={{ border: 0, background: "none", padding: 0, color: "#ef4444", cursor: "pointer", display: "inline-flex" }}
              >
                <Trash2 aria-hidden="true" style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" style={{ margin: 0, maxWidth: 220, color: "#ef4444", fontSize: 11, lineHeight: 1.3, textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}