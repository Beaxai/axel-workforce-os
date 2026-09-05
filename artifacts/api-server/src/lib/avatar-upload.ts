export const AVATAR_UPLOAD_RATE_LIMIT = 10;
export const AVATAR_UPLOAD_RATE_WINDOW_MS = 60 * 60 * 1000;
export const AVATAR_UPLOAD_GLOBAL_CONCURRENCY = 3;

export class AvatarUploadLimiter {
  private readonly attempts = new Map<string, number[]>();
  private readonly activeUsers = new Set<string>();
  private activeGlobal = 0;

  constructor(
    private readonly perUserLimit = AVATAR_UPLOAD_RATE_LIMIT,
    private readonly windowMs = AVATAR_UPLOAD_RATE_WINDOW_MS,
    private readonly globalLimit = AVATAR_UPLOAD_GLOBAL_CONCURRENCY,
  ) {}

  /** Returns an idempotent release function, or null when no slot is available. */
  tryAcquire(userId: string, now = Date.now()): (() => void) | null {
    const recent = (this.attempts.get(userId) ?? []).filter((at) => at > now - this.windowMs);
    this.attempts.set(userId, recent);
    if (
      recent.length >= this.perUserLimit ||
      this.activeUsers.has(userId) ||
      this.activeGlobal >= this.globalLimit
    ) {
      return null;
    }
    recent.push(now);
    this.attempts.set(userId, recent);
    this.activeUsers.add(userId);
    this.activeGlobal += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeUsers.delete(userId);
      this.activeGlobal -= 1;
    };
  }
}

export const avatarUploadLimiter = new AvatarUploadLimiter();

type OnceEmitter = {
  once(event: string, listener: () => void): unknown;
};

/**
 * Cover normal completion and both request/response disconnect paths. The
 * limiter's release closure is idempotent, so overlapping events are safe.
 */
export function attachAvatarUploadRelease(
  req: OnceEmitter,
  res: OnceEmitter,
  release: () => void,
): void {
  req.once("aborted", release);
  res.once("close", release);
  res.once("finish", release);
}

/** Map multer's public limit codes to safe, actionable API errors. */
export function avatarUploadErrorMessage(error: unknown): string | null {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "LIMIT_FILE_SIZE") return "Avatar source must be no larger than 5 MB";
  if (
    code === "LIMIT_FILE_COUNT" ||
    code === "LIMIT_UNEXPECTED_FILE" ||
    code === "LIMIT_FIELD_COUNT" ||
    code === "LIMIT_PART_COUNT" ||
    code === "LIMIT_FIELD_VALUE"
  ) {
    return "Upload exactly one avatar file";
  }
  return null;
}