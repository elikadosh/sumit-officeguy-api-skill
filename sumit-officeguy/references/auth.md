# Auth, credentials & error handling

## Base URL & transport
- Base: `https://api.sumit.co.il` (legacy `https://www.myofficeguy.com`). All paths below start `/api/...`.
- Method: **always POST**. `Content-Type: application/json` (also accepts `text/json`, `application/json-patch+json`, `application/*+json`).
- Error-message language: header `Content-Language: he` (default) or `en`. (Legacy `ResponseLanguage` body field is obsolete — use the header.)

## Credentials object
Almost every server request includes:
```json
"Credentials": { "CompanyID": 123456, "APIKey": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```
- `CompanyID` (int64) — organization id.
- `APIKey` (GUID string) — **private secret, server-only.**

Browser-side tokenization / read-only transaction lookup uses the **public** key instead:
```json
"Credentials": { "CompanyID": 123456, "APIPublicKey": "xxxxxxxx-..." }
```

### Public vs private — the highest-value rule
- **APIPublicKey** (browser-safe): used by `payments.js`, `/creditguy/vault/tokenizesingleuse[json]/`, `/creditguy/gateway/gettransaction/`, `/creditguy/gateway/getreferencenumbers/`. Can only mint single-use tokens / read limited data.
- **APIKey** (secret): authorizes real charges, document creation, the saved-card vault, recurring billing, and all admin. **Never put it in client code or `NEXT_PUBLIC_` env vars.**

Get/rotate keys: `https://app.sumit.co.il/developers/keys/`.

## Response envelope
```json
{ "Status": 0, "UserErrorMessage": null, "TechnicalErrorDetails": null, "Data": { } }
```
- `Status`: `Success = 0`, `BusinessError = 1`, `TechnicalError = 2`.
- `UserErrorMessage` — localized, safe to show the end user.
- `TechnicalErrorDetails` — developer diagnostics; if populated, report it to SUMIT.
- `Data` — endpoint-specific payload.

### Handling
- Treat `Status !== 0` as failure.
- `BusinessError (1)` = validation/declined → show `UserErrorMessage`.
- `TechnicalError (2)` = system fault → log `TechnicalErrorDetails`, retry/alert.
- **Exception:** `/api/accounting/documents/getpdf/` returns **binary PDF**, not JSON. Read as ArrayBuffer/Blob; never `JSON.parse`. The CRM print endpoints (`getentityprinthtml`, `getentitieshtml`) likewise return HTML/PDF, not the envelope.

## Environment variables (Next.js)
```
SUMIT_COMPANY_ID=123456
SUMIT_API_KEY=...                  # PRIVATE — server only, never NEXT_PUBLIC_
NEXT_PUBLIC_SUMIT_COMPANY_ID=123456
NEXT_PUBLIC_SUMIT_PUBLIC_KEY=...   # safe to expose (payments.js)
```

## Rate limits
Not published publicly. Implement retry-with-backoff and pass `UniqueIdentifier` on charge/transaction calls so a retry can't double-charge.

## SDKs
- **.NET:** NuGet `OfficeGuy.APIs` (Accounting, Payments/Billing, Credit Terminal, Hash Export, Letter-by-Click, SMS, Website).
- **PHP/Laravel/WooCommerce:** official `officeguy/laravel-sumit-gateway`; the open-source WooCommerce "SUMIT Payment Gateway" plugin is a useful field reference.
- **Python (community):** `ballasandballas/office_guy_api` (Swagger-generated — best public model catalog; field names are snake_case, the REST API is PascalCase).
- **No official npm/TypeScript SDK** — call REST directly (see `assets/lib-sumit.ts`).
