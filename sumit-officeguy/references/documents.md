# Accounting documents (חשבוניות)

> `DocumentType`, `Language`, `Currency` integers are in `enums.md`.

## Table of Contents
- [Create document](#create-document----apiaccountingdocumentscreate)
- [Get PDF (binary)](#get-pdf-binary----apiaccountingdocumentsgetpdf)
- [Other operations](#other-operations)
- [Locating a document](#locating-a-document)

## Create document — `/api/accounting/documents/create/`
Creates an invoice, receipt, donation receipt, price quotation, or any income document.

Request shape:
- **`Details`** (required):
  - `Type` (int, **required**) — DocumentType.
  - `IsDraft` (bool — empty = final document).
  - `Date` (JSON date, e.g. `2025-06-09`; default today).
  - `Customer` (required) — same object as customers/create (`Name`, `EmailAddress`, `Phone`, `CompanyNumber`, `ExternalIdentifier`, `NoVAT`, `SearchMode`, `ID`, …).
  - `SendByEmail` (optional) — `{ EmailAddress, Original, SendAsPaymentRequest }`.
  - `Language`, `Currency` (defaults = company settings).
  - `Description` (printed on the document), `ExternalReference` (e.g. supplier invoice #).
  - `OpeningText`/`OpeningTextHTML`, `ClosingText`/`ClosingTextHTML`, `DueDate`, `PaymentRequestText`, `Properties` (custom fields).
- **`Items`** (array, optional): `{ Quantity (default 1), UnitPrice, TotalPrice, DocumentCurrency_UnitPrice, DocumentCurrency_TotalPrice, VAT, Item: { Name, SKU, Price, SearchMode, ... }, Description }`. Use `DocumentCurrency_*` for non-ILS documents (ILS fields hold the NIS equivalent).
- **`Payments`** (array, optional): each entry has **exactly one** details sub-object — `Details_Cash`, `Details_BankTransfer`, `Details_Cheque`, `Details_CreditCard` (`{ CardBrand, Last4Digits, FirstPayment, EachPayment, Payments }`), `Details_Other`, `Details_Digital`, or `Details_TaxWithholding` — plus `Amount`/`DocumentCurrency_Amount`. Multiple payments = multiple array entries.
- `VATIncluded` (bool — is VAT in the item prices?), `VATPerItem` (bool — different VAT per line; then `VATRate` must be null and `VATIncluded` null/false), `VATRate` (empty = company default).
- `OriginalDocumentID` (int) — link to an original doc (e.g. a credit note → the invoice it credits).

Response `Data`: `DocumentID` (internal id, a.k.a. Card Number — keep for further calls), `DocumentNumber` (the printed number, e.g. 1000), `CustomerID`, `DocumentDownloadURL` (original on first fetch, certified copy after), and `DocumentPaymentURL` (for payment-request docs).

```ts
const data = await sumitFetch("/api/accounting/documents/create/", {
  Details: {
    Type: 1,                                   // InvoiceAndReceipt
    Customer: { Name: "Danny Dean", EmailAddress: "danny@dean.com",
                ExternalIdentifier: "user_42", SearchMode: 2 },
    SendByEmail: { EmailAddress: "danny@dean.com", Original: true, SendAsPaymentRequest: false },
  },
  Items: [{ Quantity: 2, UnitPrice: 50, Item: { Name: "My Product", SKU: "SKU1" } }],
  VATIncluded: true,                            // VATRate omitted → company default (18% in 2025)
});
// data.DocumentID, data.DocumentNumber, data.DocumentDownloadURL
```

## Get PDF (binary) — `/api/accounting/documents/getpdf/`
Returns **raw PDF bytes**, NOT the envelope. Request: either `DocumentID`, or `DocumentType` + `DocumentNumber`; plus `Original` (bool — signed original vs certified copy). Read as ArrayBuffer/Blob.

```ts
// app/api/invoice-pdf/route.ts
export async function POST(req: Request) {
  const { documentId } = await req.json();
  const res = await fetch("https://api.sumit.co.il/api/accounting/documents/getpdf/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      DocumentID: documentId, Original: true,
      Credentials: { CompanyID: Number(process.env.SUMIT_COMPANY_ID), APIKey: process.env.SUMIT_API_KEY },
    }),
  });
  const pdf = await res.arrayBuffer();           // NOT res.json()
  return new Response(pdf, { headers: { "Content-Type": "application/pdf" } });
}
```

## Other operations
All under `/api/accounting/documents/` unless noted.
- `getdetails/` — `{ DocumentID | (DocumentType + DocumentNumber) }` → `{ Document, Items, Payments, DocumentDownloadURL, DocumentPaymentURL, DocumentID, DocumentNumber }`. `Document` includes `AssignmentNumber` (**מספר הקצאה / allocation number**), `IsDraft`, `IsClosed`, `DocumentValue`, `CompanyValue`, `DueDate`.
- `list/` — `{ DocumentTypes?, DocumentNumberFrom/To?, DateFrom/To?, IncludeDrafts?, Paging:{StartIndex,PageSize} }` → `{ Documents, HasNextPage }`. PageSize 10–1000.
- `send/` — email an existing document. `{ EntityID | (DocumentType + DocumentNumber), EmailAddress?, SenderUserID?, Original?, Language?, PersonalMessage? }`.
- `cancel/` — storno. `{ DocumentID, Description }` → new cancelling document.
- `movetobooks/` — finalize a draft into the books. `{ DocumentID }`.
- `addexpense/` — supplier/expense doc with a Base64 file. `{ ExpenseNumber, ExpenseFile (Base64), ExpenseFilename, Supplier:{...}, Date, Lines[], Payments[], Description, IsDraft }`.
- `getdebt/` — `{ CustomerID, DebitSource, CreditSource, IncludeDraftDocuments }` → `{ Debt }`.
- `getdebtreport/` — same minus CustomerID → `{ Debts[] }`. (Debt source enum in `enums.md`.)

## Locating a document
Anywhere you see "DocumentID or DocumentType+DocumentNumber": `DocumentID` is the internal system id (the `c=` number in the web UI, and the `EntityID` delivered by triggers). `DocumentNumber` is the human number on the document (e.g. Invoice #1000). Prefer `DocumentID` when you have it.
