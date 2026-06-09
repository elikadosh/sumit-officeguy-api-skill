# CRM, deals & communications

## CRM data — `/api/crm/data/`
Generic Entity / Folder / Property / Schema / View model. An **entity** is `{ ID, Folder, Properties }` where `Folder` is an application folder name or FolderID, and `Properties` is a key→value map of fields.
- `createentity/` — `{ Entity }` → `{ EntityID }`.
- `updateentity/` — `{ Entity, CreateIfMissing?, RemoveExistingProperties? }` → `{ EntityID }`. `CreateIfMissing` only when `Entity.ID` is 0/empty; `RemoveExistingProperties` clears fields not in the request.
- `archiveentity/` — `{ EntityID }`.
- `deleteentity/` — `{ EntityID }`.
- `getentity/` — `{ EntityID, IncludeIncomingProperties?, IncludeFields? }` → `{ Entity }`. **Use this to verify a webhook by re-fetching the EntityID.**
- `listentities/` — `{ Folder (required), IncludeInheritedFolders?, Filters[], Order:{Property,Descending}, Paging:{StartIndex,PageSize}, LoadProperties? }` → `{ Entities, HasNextPage }`. PageSize 10–1000.
- `countentityusage/` — `{ EntityID }` → integer.
- `getentityprinthtml/` — `{ SchemaID, EntityID, PDF? }` → HTML or PDF (binary; not the envelope).
- `getentitieshtml/` — `{ SchemaID, ViewID, PDF? }` → HTML/PDF for a whole view.

## CRM schema & views
- `/api/crm/schema/getfolder/` — `{ Folder, IncludeProperties? }` → `{ Folder:{ID,Name}, Properties[] }`.
- `/api/crm/schema/listfolders/` — `{ NameFilter? }` → `{ Folders }`.
- `/api/crm/views/listviews/` — `{ FolderID }` → `{ Views }`.

> Folders/Views are how you target triggers (webhooks) and list queries. To watch documents, find the Documents folder/view via these endpoints, then subscribe.

## Deals — `/api/deals/`
- `adddeal/` — creates a deal and optionally a new customer. `{ Title, Customer:{...}, ExpectedCloseDate, StageID, LeadSource }` → `{ DealID }`.
- `createremark/` — `{ DealID, Content, Username }` → `{ RemarkID }`.

## Email / SMS / Fax
- Email lists: `/api/emailsubscriptions/mailinglists/list/` and `/add/` (`{ MailingListID, EmailAddress, Name }`).
- SMS lists: `/api/sms/mailinglists/list/` and `/add/` (`{ MailingListID, PhoneNumber, Name }`).
- SMS send: `/api/sms/sms/send/` (`{ Recipient, Text, Sender?, SaveDraft? }`), `/sendmultiple/` (`{ Recipients[], Text, Schedule?, Sender? }`), `/listsenders/`. Returns `{ EntityID, EstimatedQuota }`. **Requires SMS credits.**
- Fax: `/api/fax/fax/send/` — `{ FaxNumber, FileBytes (Base64), Filename, SaveDraft? }` → `{ EntityID, EstimatedQuota }`.
