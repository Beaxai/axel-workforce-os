// SignWell API client (v2.7: SignWell replaces HelloSign platform-wide).
// Fetch-based like emailService/stripeService — no SDK dependency.
//
// Mode rules mirror stripeService: in development documents are created with
// test_mode=true (free, watermarked, no legal effect); production sends real
// documents. If SIGNWELL_API_KEY is missing, callers fall back to the legacy
// stub flow so dev environments without keys keep working.

const SIGNWELL_API = "https://www.signwell.com/api/v1";

export function signwellConfigured(): boolean {
  return !!process.env.SIGNWELL_API_KEY;
}

export function signwellTestMode(): boolean {
  return process.env.NODE_ENV !== "production";
}

async function swFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = process.env.SIGNWELL_API_KEY;
  if (!key) throw new Error("SIGNWELL_API_KEY not set");
  return fetch(`${SIGNWELL_API}${path}`, {
    ...init,
    headers: {
      "X-Api-Key": key,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
}

async function swJson(path: string, init?: RequestInit): Promise<any> {
  const resp = await swFetch(path, init);
  const body: any = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`SignWell ${init?.method || "GET"} ${path} ${resp.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body;
}

export interface SignwellRecipient {
  id: string;
  name: string;
  email: string;
}

export interface SignwellFile {
  name: string; // must end in .pdf
  base64: string;
}

/**
 * Create and send a SignWell document. Each recipient gets an email with a
 * signing link (unless draft=true, used by smoke tests to avoid sending).
 * `metadata` is echoed back on webhooks — we stamp dealId there.
 * Returns the SignWell document (its `id` is our external signature id).
 */
export async function createSignwellDocument(input: {
  name: string;
  files: SignwellFile[];
  recipients: SignwellRecipient[];
  metadata?: Record<string, string>;
  draft?: boolean;
}): Promise<{ id: string; status: string; recipients: any[] }> {
  const body = {
    test_mode: signwellTestMode(),
    draft: input.draft ?? false,
    name: input.name,
    files: input.files.map((f) => ({ name: f.name, file_base64: f.base64 })),
    recipients: input.recipients.map((r, i) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      send_email: !(input.draft ?? false),
    })),
    metadata: input.metadata || {},
    reminders: true,
    apply_signing_order: false,
    // No field placement: SignWell's text tags / default flow lets signers
    // sign anywhere; field templating is a later refinement.
  };
  return swJson("/documents/", { method: "POST", body: JSON.stringify(body) });
}

/** Fetch a document's current state (used to server-side-confirm webhook claims). */
export async function getSignwellDocument(documentId: string): Promise<any> {
  return swJson(`/documents/${documentId}/`);
}

/** Download the completed (signed) PDF. Returns null until the document is completed. */
export async function downloadCompletedPdf(documentId: string): Promise<Buffer | null> {
  const resp = await swFetch(`/documents/${documentId}/completed_pdf/?url_only=false`);
  if (resp.status === 404 || resp.status === 409) return null;
  if (!resp.ok) throw new Error(`SignWell completed_pdf ${resp.status}`);
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    // Some responses return { file_url } instead of bytes.
    const body: any = await resp.json();
    if (!body?.file_url) return null;
    const fileResp = await fetch(body.file_url);
    if (!fileResp.ok) return null;
    return Buffer.from(await fileResp.arrayBuffer());
  }
  return Buffer.from(await resp.arrayBuffer());
}

/** Send a reminder email to pending recipients. */
export async function sendSignwellReminder(documentId: string): Promise<void> {
  await swJson(`/documents/${documentId}/remind/`, { method: "POST", body: JSON.stringify({}) });
}

/** Delete a document (used by smoke tests; only drafts/test docs should be deleted). */
export async function deleteSignwellDocument(documentId: string): Promise<void> {
  const resp = await swFetch(`/documents/${documentId}/`, { method: "DELETE" });
  if (!resp.ok && resp.status !== 404) throw new Error(`SignWell DELETE document ${resp.status}`);
}
