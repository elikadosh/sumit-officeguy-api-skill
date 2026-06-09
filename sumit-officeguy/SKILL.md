---
name: sumit-officeguy
description: Use when integrating the SUMIT / OfficeGuy Israeli billing & accounting API (api.sumit.co.il) — credit-card processing (סליקה), payments.js tokenization, recurring billing (הוראת קבע), saved-card vault, tax invoices/receipts (חשבוניות), allocation numbers (מספר הקצאה), webhooks/triggers, or CRM. Trigger on SUMIT, OfficeGuy, payments.js, SingleUseToken, סליקת אשראי, or charging cards / issuing documents from a server.
license: MIT
---

# SUMIT (OfficeGuy) API

## Overview

SUMIT (a.k.a. OfficeGuy) is a single, uniform Israeli billing/accounting REST API.

- **Base URL:** `https://api.sumit.co.il` (legacy `https://www.myofficeguy.com` is equivalent).
- **Every call is `POST`** with `Content-Type: application/json` and a JSON body containing a `Credentials` object.
- **Every response uses one envelope:** `{ Status, UserErrorMessage, TechnicalErrorDetails, Data }`.
  - `Status`: **Success = 0**, **BusinessError = 1**, **TechnicalError = 2**. Treat `Status !== 0` as failure.
  - **Only exception:** `/api/accounting/documents/getpdf/` returns **raw PDF bytes**, not the envelope — read as ArrayBuffer/Blob, never `JSON.parse`.
- Interactive docs / Swagger: `https://app.sumit.co.il/developers/api/`. Get keys: `https://app.sumit.co.il/developers/keys/`.
- Set `Content-Language: he` (default) or `en` header for error-message language.

## ⚠️ CRITICAL — Two keys, two trust zones

| Key | Where | Authorizes |
|-----|-------|-----------|
| **`APIPublicKey`** | **Browser** (payments.js, single-use tokenization, read-only transaction lookup) | Create single-use card tokens only — safe to expose. |
| **`APIKey`** (secret) | **Server only** — NEVER ship to the browser | Real charges, documents, saved-card vault, recurring billing, admin. |

In Next.js: charges/documents/webhooks run in route handlers/server actions with `APIKey`; the public key powers the client payment form. Use `NEXT_PUBLIC_` only for `CompanyID` and `APIPublicKey`, never for `APIKey`.

```
Credentials (server):  { "CompanyID": 123456, "APIKey": "xxxx-xxxx-..." }
Credentials (browser): { "CompanyID": 123456, "APIPublicKey": "xxxx-..." }
```

## The three e-commerce happy paths

1. **Charge a card** — payments.js tokenizes the card in the browser → returns `og-token` → POST it as `SingleUseToken` to `/api/billing/payments/charge/` (server, `APIKey`) → charges + auto-issues a document → returns `DocumentID` + `DocumentDownloadURL`. See `references/payments.md`.
2. **Issue a document** (invoice/receipt) — `/api/accounting/documents/create/`, then fetch its PDF via `/api/accounting/documents/getpdf/` (binary). See `references/documents.md`.
3. **React to events** — subscribe a webhook via `/api/triggers/triggers/subscribe/`; SUMIT POSTs an `EntityID`; re-fetch the entity with your `APIKey` to verify. See `references/webhooks-triggers.md`.

## Quick-start server wrapper (TypeScript)

```ts
// lib/sumit.ts  (server-only — imports nothing client-side)
const BASE = "https://api.sumit.co.il";

type SumitEnvelope<T> = {
  Status: number; // 0 Success, 1 BusinessError, 2 TechnicalError
  UserErrorMessage: string | null;
  TechnicalErrorDetails: string | null;
  Data: T;
};

export async function sumitFetch<T>(path: string, body: Record<string, unknown>, lang = "he"): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Language": lang },
    body: JSON.stringify({
      ...body,
      Credentials: { CompanyID: Number(process.env.SUMIT_COMPANY_ID), APIKey: process.env.SUMIT_API_KEY },
    }),
  });
  const json = (await res.json()) as SumitEnvelope<T>;
  if (json.Status !== 0) {
    throw new Error(`SUMIT ${json.Status}: ${json.UserErrorMessage ?? json.TechnicalErrorDetails ?? "error"}`);
  }
  return json.Data;
}
```

A copy-paste version plus route/handler and client-form templates live in `assets/`.

## Conventions that bite

- **Enums are sent as integers** in the JSON body (e.g. `"Type": 1`, `"SearchMode": 2`, `"DocumentType": 1`) even though Swagger labels them `"Invoice (0)"`. The full integer tables are in `references/enums.md` — do not guess.
- **CreditGuy gateway/billing use a SMALLER currency enum** (`ILS=0, USD=1, EURO=2`) than the documents/items enum (which has 150+ codes). Don't mix them.
- **Find-or-create dedup:** set `ExternalIdentifier` to your own DB id and `SearchMode = ExternalIdentifier (2)` so repeated calls update one customer/item instead of duplicating.
- **VAT is a runtime value, not a constant.** Israeli VAT = **18% since 1 Jan 2025**. Leave `VATRate` empty to use the company default, or pull it from `/api/accounting/general/getvatrate/`. Never hard-code 17%.
- **Allocation number (מספר הקצאה / חשבוניות ישראל)** is mandatory above a threshold that keeps stepping down. SUMIT obtains it automatically when the org is connected to the ITA. See `references/compliance.md`.
- **Idempotency:** pass `UniqueIdentifier` on charge/transaction calls to prevent duplicate charges on retry. It must be **stable per logical operation** (e.g. `order-<id>`) — a fresh `randomUUID()` per request defeats the dedup.
- **Israeli cards** generally require `CitizenID` (ת"ז) and `CVV` at clearing time — payments.js collects them.

## Reference map

| Need | File |
|------|------|
| Keys, envelope, credentials, error handling | `references/auth.md` |
| payments.js, charge, hosted page, saved cards, recurring, CreditGuy gateway/vault/billing, Upay | `references/payments.md` |
| create / getpdf / getdetails / list / send / cancel / movetobooks / addexpense / debt | `references/documents.md` |
| customers, income items, general (VAT/FX/bank/doc-numbers), bookkeeping | `references/customers-items.md` |
| CRM entities/schema/views, deals, email/SMS/fax | `references/crm-deals-comms.md` |
| triggers subscribe/unsubscribe, webhook verification | `references/webhooks-triggers.md` |
| multi-tenant companies, applications, permissions, users/SSO | `references/website-admin.md` |
| **all enum integer tables** (DocumentType, Currency, SearchMode, Applications, …) | `references/enums.md` |
| VAT, allocation numbers, foreign-currency, CitizenID, sandbox/test cards | `references/compliance.md` |

## Testing

Create a separate test org (name includes "בדיקות"), connect it to a **test terminal** at `https://app.sumit.co.il/developers/testterminal`, generate keys while logged into the TEST org, and use `AuthoriseOnly: true` with the test cards in `references/compliance.md`. **Never connect a real business account to a test terminal** — it disconnects live clearing.
