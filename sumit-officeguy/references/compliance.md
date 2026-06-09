# Israeli tax / compliance & sandbox

Treat VAT and allocation thresholds as **runtime/config values, not constants** — they change by date.

## VAT
- Raised from 17% → **18% effective 1 January 2025** (Israel Tax Authority, confirmed 2024-12-05). The 18% rate applies to transactions/imports whose tax-liability date is on/after 2025-01-01.
- **Do not hard-code.** Leave `VATRate` empty on documents/charges to use the company default, or pull the rate for a date from `/api/accounting/general/getvatrate/`.
- Foreign-currency invoices must show the NIS equivalent and the Bank-of-Israel representative rate on the transaction date; VAT is computed on the NIS amount. Use `/api/accounting/general/getexchangerate/` and the `DocumentCurrency_*` item fields.

## Allocation number (מספר הקצאה / "Israel Invoices" / חשבוניות ישראל)
Tax invoices above a threshold require an ITA-issued allocation number before the buyer can deduct input VAT. Phased thresholds (amounts pre-VAT):
- **NIS 25,000** from 2024-05-05
- **NIS 20,000** from 2025-01-01
- **NIS 10,000** from 2026-01-01 (per ITA VAT Implementation Order 01/2025; the NIS 15,000 step was skipped)
- **NIS 5,000** from 2026-06-01

SUMIT obtains the allocation number **automatically** when the org is connected to ITA digital services (Settings → connect to Tax Authority). Notes:
- The connection must be renewed periodically (up to one year).
- **Drafts cannot get an allocation number.**
- Payment method "Other" can block allocation for donation receipts / invoice-receipts.
- The issued number is returned as `Document.AssignmentNumber` from `documents/getdetails/`. Surface its presence on issued invoices.
- Re-check the threshold at each step-down date (notably 2026-06-01 → NIS 5,000) for B2B invoices that may cross it.

## CitizenID
Israeli acquirers commonly require the cardholder's ת"ז for clearing — collect it in payments.js (`data-og="citizenid"`) and pass via `CitizenID` / `SingleUseToken`.

## PCI
SUMIT/OfficeGuy hold a PCI DSS Attestation of Compliance (a point-in-time attestation, most recent public AoC dated 2023-08-21 — not a perpetual certification). Using payments.js keeps the PAN off your servers, but you remain responsible for PCI requirements on any page that touches a card number. Verify current status if it matters for a compliance sign-off.

## Sandbox / testing
1. Create a separate test org (name includes **"בדיקות"**) under My businesses → create business (`https://app.sumit.co.il/companies/`). Install the credit-card module.
2. Connect it to a **test terminal** at `https://app.sumit.co.il/developers/testterminal`. **Warning:** connecting to a test terminal disconnects existing live clearing — **never test on a real business account.**
3. Generate API keys at `https://app.sumit.co.il/developers/keys/` while logged into the TEST org. A dedicated "test track" (מסלול בדיקות) plan exists.

### Test cards (test terminal only — not real numbers)
Source: help.sumit.co.il/he/articles/5832877.

| Card number | Exp | CVV |
|-------------|-----|-----|
| 5326-1053-0098-5853 | 04/2026 | 934 |
| 5326-1073-0002-0772 | 05/2031 | 33 |
| 5310-8403-0278-9139 | 05/2031 | 111 |
| 4557-4404-1187-4990 | 05/2031 | 229 |
| 4557-4304-0232-1333 | 05/2031 | 98 |

Older list also includes `4557-4304-0000-0236` (04/2024, CVV 089) and Amex `3755-103905-07999` (04/2026, CVV 551). Use any valid-format CitizenID (e.g. `123456789`) and `AuthoriseOnly: true` for safe verification.

### Go-live checklist
A full **authorize → capture → invoice → PDF → webhook** cycle succeeds end-to-end on the test terminal, and a forced retry with the same `UniqueIdentifier` demonstrably does **not** create a duplicate charge.
