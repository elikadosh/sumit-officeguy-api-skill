// lib/sumit.ts — server-only SUMIT (OfficeGuy) client.
// NEVER import this into client components; it reads the secret SUMIT_API_KEY.
//
// Env:
//   SUMIT_COMPANY_ID=123456
//   SUMIT_API_KEY=...               (PRIVATE — never NEXT_PUBLIC_)
// Client-side (payments.js) uses NEXT_PUBLIC_SUMIT_COMPANY_ID + NEXT_PUBLIC_SUMIT_PUBLIC_KEY.

const BASE = "https://api.sumit.co.il";

export type SumitEnvelope<T> = {
  Status: number; // 0 Success, 1 BusinessError, 2 TechnicalError
  UserErrorMessage: string | null;
  TechnicalErrorDetails: string | null;
  Data: T;
};

export class SumitError extends Error {
  constructor(
    public status: number,
    public userMessage: string | null,
    public technical: string | null,
  ) {
    super(`SUMIT ${status}: ${userMessage ?? technical ?? "error"}`);
    this.name = "SumitError";
  }
}

/** POST a JSON body (Credentials are injected) and return the validated `Data`. */
export async function sumitFetch<T>(
  path: string,
  body: Record<string, unknown>,
  lang: "he" | "en" = "he",
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Language": lang },
    body: JSON.stringify({
      ...body,
      Credentials: {
        CompanyID: Number(process.env.SUMIT_COMPANY_ID),
        APIKey: process.env.SUMIT_API_KEY,
      },
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as SumitEnvelope<T>;
  if (json.Status !== 0) {
    throw new SumitError(json.Status, json.UserErrorMessage, json.TechnicalErrorDetails);
  }
  return json.Data;
}

/** Fetch a document PDF as raw bytes (getpdf returns binary, NOT the envelope). */
export async function sumitGetPdf(
  args: { DocumentID: number; Original?: boolean } | { DocumentType: number; DocumentNumber: number; Original?: boolean },
): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/api/accounting/documents/getpdf/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...args,
      Credentials: {
        CompanyID: Number(process.env.SUMIT_COMPANY_ID),
        APIKey: process.env.SUMIT_API_KEY,
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new SumitError(2, null, `getpdf HTTP ${res.status}`);
  return res.arrayBuffer(); // never res.json()
}
