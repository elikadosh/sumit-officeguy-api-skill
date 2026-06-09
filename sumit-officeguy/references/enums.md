# SUMIT enums (integer values)

Values verified against the live Swagger (`app.sumit.co.il/developers/api/`, API v1/v3). **Send the integer** in the JSON body — Swagger displays `"Invoice (0)"` but the wire value is `0`. Re-check against live Swagger before relying on any value for production money flows.

## Table of Contents
- [Status](#status)
- [DocumentType](#documenttype)
- [Language](#language)
- [Currency (documents & items)](#currency-documents--items)
- [Currency (CreditGuy gateway/billing)](#currency-creditguy-gatewaybilling)
- [Customer SearchMode](#customer-searchmode)
- [IncomeItem SearchMode](#incomeitem-searchmode)
- [PaymentMethod Type](#paymentmethod-type)
- [CreditGuy ParamJ / TransactionType / redirect Mode](#creditguy-paramj--transactiontype--redirect-mode)
- [TriggerType](#triggertype)
- [Applications](#applications)
- [Role](#role)
- [CompanyType](#companytype)
- [DocumentsTheme](#documentstheme)
- [Debt sources (getdebt / getdebtreport)](#debt-sources-getdebt--getdebtreport)
- [Recurring AutomaticBilling documents](#recurring-automaticbilling-documents)
- [Upay Program](#upay-program)

## Status
`Success = 0`, `BusinessError = 1`, `TechnicalError = 2`.

## DocumentType
Used by `documents/create`, `getpdf`, `getdetails`, `send`, `getnextdocumentnumber`, `payments/charge` (`DocumentType`), etc.

| # | Name | # | Name |
|---|------|---|------|
| 0 | Invoice | 12 | PriceQuotation |
| 1 | InvoiceAndReceipt (חשבונית מס/קבלה) | 13 | PaymentRequest |
| 2 | Receipt | 14 | CreditDonationReceipt |
| 3 | ProformaInvoice (חשבון עסקה) | 15 | ExpenseInvoiceReceipt |
| 4 | DonationReceipt | 16 | ExpenseInvoice |
| 5 | CreditInvoice (זיכוי) | 17 | ExpenseReceipt |
| 6 | CreditInvoiceAndReceipt | 18 | ExpenseRequest |
| 7 | CreditReceipt | 19 | CreditExpenseInvoiceReceipt |
| 8 | Order | 20 | CreditExpenseInvoice |
| 9 | DeliveryNote (תעודת משלוח) | 21 | CreditExpenseReceipt |
| 10 | GoodsReturnNote | 22 | SupplierPayment |
| 11 | PurchasingOrder | | |

Most common for e-commerce: **`1` (InvoiceAndReceipt)** when payment is captured, `0` (Invoice) for unpaid, `2` (Receipt) for a standalone receipt.

## Language
`Hebrew = 0`, `English = 1`, `Arabic = 2`, `Spanish = 3`.

## Currency (documents & items)
Large enum used by `documents/create` (`Currency`), income items, and `payments/charge` item `Currency`. Common codes:

`ILS = 0`, `USD = 1`, `EUR = 2`, `CAD = 3`, `CHF = 4`, `GBP = 5`, `AUD = 6`, `JPY = 8`, `SEK = 9`, `NOK = 10`, `DKK = 11`, `ZAR = 12`, `JOD = 13`, `LBP = 14`, `EGP = 15`, `CNY = 156`, `HKD = 344`, `INR = 356`, `IDR = 360`, `KRW = 410`, `MXN = 484`, `NZD = 554`, `RUB = 643`, `SGD = 702`, `THB = 764`, `AED = 784`, `BGN = 975`, `PLN = 985`, `BRL = 986`, `RON = 946`, `TRY = 949`, `UAH = 980`.

The full ISO-4217-numeric set is supported (e.g. `CZK = 203`, `HUF = 348`, `ISK = 352`, `HRK = 191`, `RSD = 941`, `GEL = 981`, `NGN = 566`, `PHP = 608`, `MYR = 458`, `VND = 704`, …). When in doubt, the integer equals the ISO-4217 numeric code, with these legacy exceptions near the top of the enum: ILS=0, USD=1, EUR=2, CAD=3, CHF=4, GBP=5, AUD=6, JPY=8, SEK=9, NOK=10, DKK=11, ZAR=12, JOD=13, LBP=14, EGP=15.

## Currency (CreditGuy gateway/billing)
**Different, smaller enum** — only `ILS = 0`, `USD = 1`, `EURO = 2`. Used by `/api/creditguy/gateway/*` and `/api/creditguy/billing/*`. Do not use the large currency enum here.

## Customer SearchMode
`Automatic = 0`, `None = 1`, `ExternalIdentifier = 2`, `Name = 3`, `CompanyNumber = 4`, `Phone = 5`, `EmailAddress = 6`.

Dedup pattern: `ExternalIdentifier` = your DB id + `SearchMode = 2`.

## IncomeItem SearchMode
`Automatic = 0`, `None = 1`, `ExternalIdentifier = 2`, `Name = 3`, `SKU = 4`, `Description = 5`.
(Note: differs from Customer — `4`/`5` mean SKU/Description here, not CompanyNumber/Phone.)

## PaymentMethod Type
`Other = 0`, `CreditCard = 1`, `DirectDebit = 2`. Used in saved-card vault and charge `PaymentMethod.Type`.

## CreditGuy ParamJ / TransactionType / redirect Mode
- **`ParamJ`** (`/creditguy/gateway/transaction/`): `CheckDetails = 2` (J2 verify-only), `Charge = 4` (J4 debit), `AuthorizeOnly = 5` (J5 hold/pre-auth). Shva result code **`000` = success**.
- **`TransactionType`**: `Debit = 1`, `StandingOrder = 11`, `Credit = 51`, `CreditEMV = 53`.
- **`/creditguy/gateway/beginredirect/` Mode**: `TokenizeOnly = 0`, `ValidateCard = 2`, `Charge = 4`, `Authorize = 5`.
- **`/creditguy/billing/process/` status**: `Started`, `Processing`, `Processed`.

## TriggerType
`/triggers/triggers/subscribe/` — sent as the string: `CreateOrUpdate`, `Create`, `Update`, `Archive`, `Delete`.

## Applications
`/website/companies/installapplications/`. Sent as the string name (or integer):
`CreditCard = 0`, `DirectDebit = 1`, `RecurringBilling = 2`, `PurchasePages = 3`, `CRM = 4`, `EmailSubscriptions = 5`, `SMS = 6`, `Accounting = 7`, `Expenses = 8`, `Cheques = 9`, `PayPal = 10`, `TaskManagement = 11`, `TimeClock = 12`, `TimeRecorder = 13`, `BusinessCard = 14`, `Calendar = 16`, `Fax = 17`, `AccountingHashExport = 18`.
(15 is intentionally absent.)

## Role
`/website/permissions/set/` and `/website/users/create/`. Sent as string:
`Shared`, `ReadOnly`, `None`, `Accountant`, `Manager`, `Owner`.

## CompanyType
`/website/companies/create|update/`:
`CompanyWithVAT = 0`, `VATExemptDealer = 1` (עוסק פטור), `LicensedDealer = 2` (עוסק מורשה), `Fellowship = 3`, `Partnership = 4`, `CommunityInterestCompany = 5`, `Cooperative = 6`, `HouseCommittee = 7`, `ElectionGroup = 8`, `Party = 9`, `SelfEmployed = 10`, `PublicTrust = 11`.

## DocumentsTheme
`/accounting/general/updatesettings/`:
`White = 1`, `Orange = 2`, `Green = 3`, `Purple = 4`, `Material = 5`, `SumitClean = 15`, `SumitStandard = 16`, `Sharon = 20`.

## Debt sources (getdebt / getdebtreport)
`DebitSource` / `CreditSource`:
`TaxInvoice = 1`, `ProformaInvoice = 2`, `PaymentRequest = 3`, `Receipt = 4`, `ProformaInvoicePaymentRequest = 5`, `ProformaInvoicePaymentRequestTaxInvoice = 6`.

## Recurring AutomaticBilling documents
`/billing/recurring/updatesettings/`:
- `AutomaticBilling_ChargeDocument`: `InvoiceReceipt = 0`, `Invoice = 1`, `Receipt = 2`, `DonationReceipt = 3`, `ProformaInvoice = 4`, `Order = 5`, `PaymentRequest = 6`, `Automatic = 9`, `None = 10`.
- `AutomaticBilling_DocumentsOnlyDocument`: `ProformaInvoice = 0`, `Order = 1`, `Invoice = 2`, `PaymentRequest = 3`, `None = 10`.

## Upay Program
`/billing/generalbilling/openupayterminal/`:
`OFFICEGUYNEW10 = 1`, `UPAYTRANSACTION = 2`, `OFFICEGUYNEWMONTHLY10 = 3`, `OFFICEGUYMONTHLYNEW10 = 4`.
