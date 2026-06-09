# Website / multi-tenant admin — `/api/website/`

For platforms that create and manage SUMIT organizations on behalf of others. (Applications/Role/CompanyType integers in `enums.md`.)

## Companies — `/api/website/companies/`
- `create/` — new organization. **Requires an active payment method** on the calling org (the new org inherits it). Body `{ Company:{ Name, EmailAddress, DocumentsEmailAddress, Country, Address, Phone, Fax, Title, CorporateNumber, English_*, CompanyType, Logo (Base64), Website }, User?:{ Name, EmailAddress, Password, Phone, SkipActivation }, Applications?[], HideFromCompaniesList? }`. Returns `{ CompanyID, APIKey, APIPublicKey, UserPassword?, UserEncryptedPassword? }` — **store the keys**.
- `update/` — same `Company` object.
- `getdetails/` — `{}` → `{ Company }`.
- `listquotas/` — `{}` → usage/quota `Data[]`.
- `installapplications/` — `{ Applications[] }`. **May incur charges.** Application enum in `enums.md`. (Also `installadditions/` / `removeadditions/`.)

## Permissions — `/api/website/permissions/`
- `set/` — `{ UserID, Role }`.
- `remove/` — `{ UserID }`.
Role: `Shared`, `ReadOnly`, `None`, `Accountant`, `Manager`, `Owner`.

## Users — `/api/website/users/`
- `create/` — `{ User:{ Name, EmailAddress, Password, Phone, SkipActivation }, Role }` → `{ UserID }`. Creates a user and grants it permission on the current org.
- `loginredirect/` — `{ EmailAddress, Password }` → `{ RedirectURL }` for SSO without exposing credentials in the URL. **Note: does not validate the credentials** — it will mint a redirect even for wrong credentials, so only call it with credentials you trust.
