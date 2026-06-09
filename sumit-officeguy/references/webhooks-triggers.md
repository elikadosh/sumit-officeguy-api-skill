# Triggers / webhooks

`/api/triggers/triggers/` — the mechanism to react to new documents/payments/customers. (Usually wired by make.com/Zapier, but callable directly.)

## Subscribe
`subscribe/` — register a webhook.
```json
{
  "URL": "https://your-app.com/api/sumit-webhook",
  "Folder": "<folder name or FolderID>",
  "View": 0,
  "TriggerType": "Create",
  "Credentials": { "CompanyID": 123456, "APIKey": "..." }
}
```
- `URL` — your endpoint.
- `Folder` / `View` — what to watch (resolve via `/api/crm/schema/listfolders/`, `/api/crm/views/listviews/`). To fire on new documents, subscribe to the Documents folder.
- `TriggerType` — `CreateOrUpdate` / `Create` / `Update` / `Archive` / `Delete`.

## Unsubscribe
`unsubscribe/` — `{ URL }`.

## Delivery & verification
When a matching entity changes, SUMIT **POSTs an `EntityID`** to your URL.

**Do not trust the payload blindly.** Treat `EntityID` as a pointer and re-fetch the entity server-side with your **private** key:
- documents → `/api/accounting/documents/getdetails/` with `{ DocumentID: EntityID }`
- generic entities → `/api/crm/data/getentity/` with `{ EntityID }`

Also use a hard-to-guess webhook URL / shared secret, and respond `200` quickly.

```ts
// app/api/sumit-webhook/route.ts  (URL registered via triggers/subscribe)
import { NextRequest, NextResponse } from "next/server";
import { sumitFetch } from "@/lib/sumit";

export async function POST(req: NextRequest) {
  const { EntityID } = await req.json();
  // Re-fetch with the private key to verify authenticity, then act:
  const { Document } = await sumitFetch("/api/accounting/documents/getdetails/", { DocumentID: EntityID });
  // ...fulfill order, mark paid, etc.
  return NextResponse.json({ ok: true });
}
```
