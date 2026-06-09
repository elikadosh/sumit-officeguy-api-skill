<div align="center">

# SUMIT / OfficeGuy API — Claude Agent Skill

**A production-grade [Claude Agent Skill](https://agentskills.io) for the Israeli SUMIT (OfficeGuy) billing & accounting API** — credit-card processing (סליקה), `payments.js` tokenization, recurring billing (הוראת קבע), tax invoices & receipts (חשבוניות), allocation numbers (מספר הקצאה), webhooks, and CRM.

[![Agent Skill](https://img.shields.io/badge/Claude-Agent%20Skill-d97757)](https://agentskills.io/specification)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![API](https://img.shields.io/badge/API-api.sumit.co.il-0a7)](https://app.sumit.co.il/developers/api/)
[![Made for](https://img.shields.io/badge/stack-Next.js%20%C2%B7%20TypeScript-000)](#quick-start)
[![Israel](https://img.shields.io/badge/🇮🇱-Israeli%20Tax%20Compliant-0038b8)](#israeli-tax--compliance)

</div>

---

## What is this?

This repository packages a **Claude Agent Skill** that teaches Claude (in [Claude Code](https://www.claude.com/product/claude-code), Claude.ai, or the Anthropic API) how to integrate the **SUMIT / OfficeGuy** REST API correctly the first time — without hallucinating endpoints, enum values, or mixing up public and secret API keys.

It follows Anthropic's [progressive-disclosure](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) authoring model: a lean `SKILL.md` that Claude loads on demand, plus per-domain reference files it opens only when needed. Every enum integer was reconciled against the **live SUMIT Swagger** (API v1/v3), and the whole skill was verified with an automated retrieval test.

> **SUMIT** (formerly **OfficeGuy** / מיי אופיס גай) is one of Israel's leading billing, invoicing, payments, and accounting platforms. Base URL: `https://api.sumit.co.il`.

## Why it exists

Integrating SUMIT has three classic footguns. This skill bakes the fixes in:

| Footgun | What the skill enforces |
| --- | --- |
| 🔑 **Leaking the secret key** | `APIPublicKey` is browser-only (payments.js tokenization); the secret `APIKey` is server-only and never reaches `NEXT_PUBLIC_`. |
| 🔢 **Wrong enum values** | All enums are sent as **integers** (`DocumentType: 1`, `SearchMode: 2`, …) — full authoritative tables for DocumentType (0–22), Currency, Applications, SearchMode, and more. |
| 📄 **Parsing the PDF as JSON** | `documents/getpdf` returns **raw bytes**, not the `{Status, Data}` envelope — read it as an `ArrayBuffer`, never `res.json()`. |

Plus: idempotency keys that actually prevent double charges, find-or-create customer dedup, the Israeli **18% VAT** rule (since 1 Jan 2025), and the **allocation-number (חשבוניות ישראל)** mandate.

## Quick start

### Use it with Claude Code

```bash
# Clone into your personal skills directory (folder name must stay "sumit-officeguy")
git clone https://github.com/<you>/sumit-officeguy-api-skill.git
cp -r sumit-officeguy-api-skill/sumit-officeguy ~/.claude/skills/
```

Claude Code auto-discovers the skill and activates it whenever you mention **SUMIT, OfficeGuy, payments.js, סליקה, חשבונית, SingleUseToken**, or charging cards / issuing documents from a server.

### Use the bundled TypeScript helper

```ts
// lib/sumit.ts (server-only) — see sumit-officeguy/assets/lib-sumit.ts
import { sumitFetch } from "@/lib/sumit";

const data = await sumitFetch("/api/billing/payments/charge/", {
  SingleUseToken: ogToken,                       // from payments.js (public key)
  Customer: { Name, EmailAddress, ExternalIdentifier: userId, SearchMode: 2 },
  Items: [{ Item: { Name: "Pro plan", SKU: "PRO" }, Quantity: 1, UnitPrice: 99 }],
  VATIncluded: true,                             // VATRate omitted → company default (18%)
  DocumentType: 1,                              // InvoiceAndReceipt — חשבונית מס/קבלה
  SendDocumentByEmail: true,
  UniqueIdentifier: `order-${orderId}`,         // STABLE → blocks duplicate charge on retry
});
// → { Payment, DocumentID, DocumentNumber, DocumentDownloadURL }
```

## The three e-commerce happy paths

1. **Charge a card** — `payments.js` tokenizes the card in the browser → returns `og-token` → server posts it as `SingleUseToken` to `/api/billing/payments/charge/` → charges + auto-issues a document.
2. **Issue & download a document** — `/api/accounting/documents/create/`, then `/api/accounting/documents/getpdf/` (binary PDF).
3. **React to events** — subscribe a webhook via `/api/triggers/triggers/subscribe/`; SUMIT POSTs an `EntityID`; re-fetch it server-side with the secret key to verify.

## What's inside

```
sumit-officeguy/
├── SKILL.md                  # Overview, auth box, happy paths, server wrapper, reference map
├── references/
│   ├── auth.md               # Keys, response envelope, error handling, env vars, SDKs
│   ├── payments.md           # payments.js, charge, hosted page, saved-card vault,
│   │                         #   recurring (הוראת קבע), CreditGuy gateway/vault/billing, Upay
│   ├── documents.md          # create / getpdf / getdetails / list / send / cancel / addexpense
│   ├── customers-items.md    # customers, income items, VAT & FX rates, bank verify, bookkeeping
│   ├── crm-deals-comms.md    # CRM entities/schema/views, deals, email / SMS / fax
│   ├── webhooks-triggers.md  # triggers subscribe + webhook verification pattern
│   ├── website-admin.md      # multi-tenant companies, applications, permissions, users/SSO
│   ├── enums.md              # ★ every enum integer table (DocumentType, Currency, Applications…)
│   └── compliance.md         # VAT 18%, allocation numbers, foreign currency, sandbox + test cards
└── assets/
    ├── lib-sumit.ts          # server-only fetch wrapper (sumitFetch + sumitGetPdf)
    └── payment-form.html     # payments.js client tokenization template
```

## API coverage

Payments · `payments.js` tokenization · single-use tokens · hosted payment pages · saved-card vault · recurring / standing orders (הוראת קבע) · CreditGuy gateway, vault & batch billing · Upay · accounting documents (invoices, receipts, credit notes, proforma, price quotations, expenses) · binary PDF retrieval · customers & income items · VAT & exchange rates · bank-account verification · bookkeeping batches · CRM entities/schemas/views · deals · email/SMS/fax · webhooks/triggers · multi-tenant org & user administration.

## Israeli tax & compliance

- **VAT = 18%** since **1 January 2025** (Israel Tax Authority). The skill never hard-codes it — leave `VATRate` empty for the company default, or pull `/api/accounting/general/getvatrate/`.
- **Allocation number / מספר הקצאה** (חשבוניות ישראל reform): obtained automatically when the org is connected to ITA digital services; surfaced as `Document.AssignmentNumber`. Thresholds step down NIS 25,000 → 20,000 → 10,000 → 5,000 through June 2026.
- **CitizenID (ת"ז)** collected client-side for acquirer clearing.
- Includes a **sandbox guide** with test-terminal setup and test cards.

## Disclaimer

Community project — **not affiliated with or endorsed by SUMIT / OfficeGuy.** Enum values and field names were reconciled against the live Swagger but the API evolves; verify against [the official docs](https://app.sumit.co.il/developers/api/) before shipping money flows. Always test against a dedicated **test terminal**, never a live business account.

## License

[MIT](LICENSE) © Eli Kadosh

---

<div align="center">
<sub>Keywords: SUMIT API · OfficeGuy API · Israeli billing API · סליקת אשראי · חשבוניות · payments.js · Claude Agent Skill · Claude Code · Anthropic · Next.js · TypeScript · recurring billing · הוראת קבע · allocation number · מספר הקצאה · Israel VAT</sub>
</div>
