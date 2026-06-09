# Customers, income items & general

> SearchMode / Currency / DocumentsTheme integers are in `enums.md`.

## Customers — `/api/accounting/customers/`
- `create/` — find-or-create per `SearchMode`. Body `{ Details: { Name, Phone, EmailAddress, City, Address, ZipCode, CompanyNumber, ExternalIdentifier, NoVAT, SearchMode, ID, Folder, Properties } }`. Returns `{ CustomerID, CustomerHistoryURL }`.
  - `NoVAT: true` for VAT-exempt customers.
  - Dedup: set `ExternalIdentifier` = your DB id and `SearchMode = 2 (ExternalIdentifier)`; repeated calls update one customer.
- `update/` — same `Details` shape → `{ CustomerID }`.
- `getdetailsurl/` — `{ CustomerID }` → `{ CustomerHistoryURL }` (the customer info page, דף מידע ללקוח/ה).
- `createremark/` — `{ CustomerID, Content, Username }` → `{ RemarkID }`.

## Income items — `/api/accounting/incomeitems/`
- `create/` — `{ IncomeItem: { Name, Description, Price, Cost, Currency, SKU, ExternalIdentifier, SearchMode, ID, Properties } }` → `{ EntityID }`. Item `SearchMode`: Automatic=0, None=1, ExternalIdentifier=2, Name=3, **SKU=4, Description=5** (differs from customer search mode).
- `list/` — `{ Paging:{StartIndex,PageSize} }` → `{ IncomeItems, HasNextPage }`. *(Marked alpha — may change.)*

## General — `/api/accounting/general/`
- `getvatrate/` — `{ Date? }` → `{ Rate }`. **Use this instead of hard-coding VAT.** (18% from 2025-01-01.)
- `getexchangerate/` — `{ Date?, Currency_From?, Currency_To? }` → `{ Rate }`. Bank-of-Israel representative rate (default USD→ILS).
- `verifybankaccount/` — `{ BankCode, BranchCode, AccountNumber, VerifyBranchNumber?, VerifyLimitedAccount? }` → `{ Result, ValidBranch, IsLimitedAccount }` (each can be true/false/null). Limited "account exists" check.
- `getnextdocumentnumber/` — `{ Type }` → `{ NextDocumentNumber }`.
- `setnextdocumentnumber/` — `{ Type, NextDocumentNumber }` (must be higher than the last issued; defaults start at 1000).
- `updatesettings/` — `{ DocumentsEmailAddressSpecified, DocumentsEmailAddress, AccountantEmailSpecified, AccountantEmail, IncomeTaxCreditForDonation, EnableCustomDocumentDates, DocumentsTheme }`. `EnableCustomDocumentDates` lets you backdate documents (default: sequential dates only). `IncomeTaxCreditForDonation` marks an NPO as 46a-approved for donation receipts. `DocumentsTheme` enum in `enums.md`.

## Bookkeeping
- `/api/books/transactions/createbatch/` — batch journal entries. `{ DatabaseID, BatchDescription, Transactions:[{ Reference1, Reference2, ReferenceDate, ValueDate, DebitAccountCode, CreditAccountCode, AmountILS, Details }] }` → `{ BatchURL }`.
- `/api/accountinghashexport/export/send/` — email a Hashavshevet hash export.
- `/api/stock/stock/list/` — `{ ItemIDs?, ExcludeZeroStock? }` → `{ Stock }`.
- `/api/scheduleddocuments/documents/createfromdocument/` — `{ DocumentID, IncomeItem }` → `{ ScheduledDocuments }`.
- `/api/customerservice/tickets/create/` — multipart with `Attachments[]` → `{ TicketID }`.
