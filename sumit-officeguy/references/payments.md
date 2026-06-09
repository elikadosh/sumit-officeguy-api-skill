# Payments / card processing (סליקה)

> Enum integers (DocumentType, PaymentMethod.Type, ParamJ, currencies) are in `enums.md`. Note the CreditGuy currency enum (`ILS=0,USD=1,EURO=2`) differs from the documents/items currency enum.

## Table of Contents
- [payments.js — client tokenization](#paymentsjs--client-tokenization)
- [Charge customer](#charge-customer----apibillingpaymentscharge)
- [Hosted payment page (redirect)](#hosted-payment-page----apibillingpaymentsbeginredirect)
- [Get / list payments](#get--list-payments)
- [Saved cards (token vault)](#saved-cards-token-vault----apibillingpaymentmethods)
- [Recurring / standing orders](#recurring--standing-orders-הוראת-קבע----apibillingrecurring)
- [CreditGuy gateway (terminal)](#creditguy-gateway-credit-terminal----apicreditguygateway)
- [CreditGuy vault (tokenization)](#creditguy-vault-tokenization----apicreditguyvault)
- [CreditGuy billing (batch)](#creditguy-billing-batch----apicreditguybilling)
- [Upay / general billing](#upay--general-billing----apibillinggeneralbilling)
- [Shva / terminal terminology](#shva--terminal-terminology)

## payments.js — client tokenization
Keeps the PAN off your server (PCI scope reduction). Uses the **public** key.

```html
<script src="https://app.sumit.co.il/scripts/payments.js"></script>
<script>
jQuery(function () {
  OfficeGuy.Payments.BindFormSubmit({
    CompanyID: YOUR_COMPANY_ID,
    APIPublicKey: 'YOUR_API_PUBLIC_KEY'
  });
});
</script>

<form data-og="form" method="post">
  <div class="og-errors"></div>
  <input type="text" data-og="cardnumber" />
  <input type="text" data-og="expirationmonth" />
  <input type="text" data-og="expirationyear" />   <!-- 4 digits -->
  <input type="text" data-og="cvv" />
  <input type="text" data-og="citizenid" />        <!-- Israeli ת"ז, usually required -->
  <input type="submit" value="Submit" />
</form>
```
On submit, payments.js adds a hidden **`og-token`** field. Send its value as **`SingleUseToken`** to your server, which calls `/api/billing/payments/charge/` with the **APIKey**. The token is single-use.

Under the hood payments.js calls `/api/creditguy/vault/tokenizesingleuse[json]/` (public key). Docs: help.sumit.co.il/he/articles/5893615.

## Charge customer — `/api/billing/payments/charge/`
Server-side, **APIKey**. Charges and (by default) auto-issues a document. Three shapes:
(a) new customer = `Customer` details + token/card + `Items`;
(b) existing customer, card not saved = `Customer.ID` + token/card;
(c) existing customer with saved card = `Customer.ID` + items only.

Key fields:
- `Customer` — `{ Name, EmailAddress, Phone, ExternalIdentifier, SearchMode, NoVAT, ID, ... }`.
- `SingleUseToken` — the `og-token` from payments.js (**preferred**). Alternatives: raw card fields in `PaymentMethod` (raises PCI scope), a saved `PaymentMethod` (token/ID), or `CreditCardAuthNumber` from a prior gateway transaction.
- `PaymentMethod` — `{ CreditCard_Number, CreditCard_ExpirationMonth, CreditCard_ExpirationYear, CreditCard_CVV, CreditCard_CitizenID, CreditCard_Token, Type }` or DirectDebit fields. `Type`: Other=0, CreditCard=1, DirectDebit=2.
- `Items` — array of `{ Item: { Name, SKU, Price, ... }, Quantity, UnitPrice, Total, Currency, Description }`.
- `Payments_Count` / `Payments_FirstAmount` / `Payments_NonFirstAmount` — installments (תשלומים). `Payments_Credit` (bool) = credit transaction (עסקת קרדיט).
- `VATIncluded` (bool), `VATRate` (float — empty = company default).
- `DocumentType` (int — which doc to auto-issue), `DraftDocument` (bool), `PreventDocumentCreation` (bool).
- `SendDocumentByEmail` (bool), `UpdateCustomerByEmail` (+`_AttachDocument`, `_Language`), `SendCopyToOrganization` (bool), `DocumentLanguage`, `DocumentDescription`.
- `AuthoriseOnly` (bool) — validate without committing (testing / pre-auth). **When true, documents are issued as Draft.**
- `AutoCapture` (bool) — default true = capture (J4); false = authorize only (J5) and issues an **Order** doc instead of invoice/receipt.
- `AuthorizeAmount` (float) — custom authorization amount.
- `MerchantNumber` — pick a specific Shva terminal when several are configured.
- `CardTokenNotNeeded` (bool) — skip saving the token on the customer.
- `UniqueIdentifier` — idempotency key (prevents duplicate charge on retry). *(Set this on every charge.)*

Response `Data`: a `Payment` object (`ID`, `CustomerID`, `ValidPayment`, `Status`, `Amount`, `AuthNumber`, `PaymentMethod` with last-4, `RecurringCustomerItemIDs`), plus `DocumentID`, `DocumentNumber`, `CustomerID`, `DocumentDownloadURL` (signed PDF) when a document was produced.

```ts
// app/api/checkout/route.ts (App Router)
import { NextRequest, NextResponse } from "next/server";
import { sumitFetch } from "@/lib/sumit";

export async function POST(req: NextRequest) {
  const { singleUseToken, customer, items, paymentsCount, orderId } = await req.json();
  try {
    const data = await sumitFetch("/api/billing/payments/charge/", {
      SingleUseToken: singleUseToken,
      Customer: customer,            // { Name, EmailAddress, Phone, ExternalIdentifier, SearchMode: 2 }
      Items: items,                  // [{ Item: { Name, SKU }, Quantity, UnitPrice }]
      Payments_Count: paymentsCount ?? 1,
      VATIncluded: true,
      DocumentType: 1,               // InvoiceAndReceipt
      SendDocumentByEmail: true,
      UniqueIdentifier: `order-${orderId}`, // STABLE per order — a fresh UUID per
                                            // request would NOT block a duplicate on retry
    });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 402 });
  }
}
```

There is also `/api/billing/payments/multivendorcharge/` — splits one card charge across multiple vendor companies (each `Items[]` carries its own `CompanyID`/`APIKey`); returns a `Vendors` array.

## Hosted payment page (redirect) — `/api/billing/payments/beginredirect/`
Server returns `Data.RedirectURL` to a SUMIT-hosted secure page (embeddable in an iframe). You never touch card fields. Accepts `Customer`, `Items`, `VATIncluded`, `DocumentType`, installments (`MaximumPayments`, `MinimumPaymentsCredit`), `ExpirationHours` (default 1, max 240), `Language`, `Header`, `DraftDocument`, `PreventSavingPaymentMethod`, `IPNURL`, and:
- `RedirectURL` — on success SUMIT appends **`OG-CustomerID`**, **`OG-PaymentID`**, **`OG-ExternalIdentifier`**.
- `CancelRedirectURL`, `ExternalIdentifier`, `UpdateOrganizationOnSuccess/Failure`, `UpdateCustomerOnSuccess`, `SendUpdateByEmailAddress`.

## Get / list payments
- `/api/billing/payments/get/` — `{ PaymentID }` → full `Payment`.
- `/api/billing/payments/list/` — `{ Date_From, Date_To, Valid?, StartIndex }` → `{ Payments, HasNextPage }` for reconciliation.

## Saved cards (token vault) — `/api/billing/paymentmethods/`
- `setforcustomer/` — save a tokenized card or direct-debit on a customer. Pass `Customer` + either `SingleUseToken` (from payments.js) or a `PaymentMethod` object. Generate the token client-side; don't post raw PANs. `PaymentMethod` fields include `CreditCard_Token`, `CreditCard_ExpirationMonth/Year`, `DirectDebit_Bank/Branch/Account/ExpirationDate/MaximumAmount`, `Type`.
- `getforcustomer/` — `{ Customer, IncludeInactive? }` → `{ PaymentMethod, InactivePaymentMethods }`. Never returns the full PAN (only `CreditCard_LastDigits`/`CardMask`).
- `remove/` — `{ Customer }`.

With a saved card, charge by passing just `Customer.ID` (+ items) to `payments/charge/`.

## Recurring / standing orders (הוראת קבע) — `/api/billing/recurring/`
- `charge/` — charge now **and** create a recurring payment. Each `Items[]` carries `Item.Duration_Months`/`Item.Duration_Days` (interval), item-level `Duration_*`, `Recurrence` (count; 0/null = continuous), `Date_Start`, `Quantity`, `UnitPrice`. Also `AttributionOffset`, `CreditCardPayments_Count`, `OnlyDocument` (docs without charging), `FirstDocumentDescription`. Response adds `RecurringCustomerItemIDs`.
- `listforcustomer/` — `{ Customer, IncludeInactive? }` → `RecurringItems`.
- `update/` — `{ Customer, RecurringCustomerItemID, UnitPrice?, Quantity?, Recurrence?, NextPaymentDate?, LastPaymentDate? }` (`Recurrence` and `LastPaymentDate` are mutually exclusive).
- `cancel/` — `{ Customer, RecurringCustomerItemID }`.
- `updatesettings/` — automatic-billing modes; see `AutomaticBilling_*` enums in `enums.md`.

## CreditGuy gateway (credit terminal) — `/api/creditguy/gateway/`
Low-level; **for common cases use `payments/charge/` instead.** Server-side, APIKey (except read calls below).
- `transaction/` — key field **`ParamJ`**: `CheckDetails(2)` J2 verify, `Charge(4)` J4 debit, `AuthorizeOnly(5)` J5 hold. Plus `CardNumber`/`FormatPreservingToken`/`CardToken`/`SingleUseToken`, `ExpirationMonth/Year`, `Amount`, `CVV`, `CitizenID`, `Currency` (small enum), `TransactionType` (Debit=1/StandingOrder=11/Credit=51/CreditEMV=53), `MerchantNumber`, `UniqueIdentifier`, `CustomData_1..5`. Response `Data`: `Success`, **`ResultCode` (`000` = success)**, `ResultDescription`, `TransactionID`, `AuthNumber`, `CardToken`, `CardPattern` (last 4).
- `gettransaction/` — read a transaction (public key OK). `{ ID | UniqueIdentifier, IncludeFirstDigits? }`.
- `beginredirect/` — hosted terminal redirect. `Mode`: TokenizeOnly=0, ValidateCard=2, Charge=4, Authorize=5.
- `getreferencenumbers/` — Shva reference numbers by `IDs`/`UniqueIdentifiers` (public key OK, max 1000).

## CreditGuy vault (tokenization) — `/api/creditguy/vault/`
- `tokenize/` — card number → token (APIKey). `GetFormatPreserving` for an FP token; `ForceFormatPreservingToken` to migrate tokens from another processor (must be a random, non-reversible id).
- `tokenizesingleuse/` (multipart) and `tokenizesingleusejson/` (JSON) — tokenize full details (CardNumber, Expiration, CVV, CitizenID) for **single use**, using the **APIPublicKey**. This is what payments.js calls; you rarely call it directly.

## CreditGuy billing (batch) — `/api/creditguy/billing/`
Bulk processing through the Shva transmit/deposit lifecycle.
- `load/` — `{ BillingIdentifier, Transactions[] }` (each: `CardToken`/`FormatPreservingToken`, `ExpirationMonth/Year`, `Amount`, `Currency` small enum, `AuthNumber`, `CitizenID`, `UniqueIdentifier`, `MerchantNumber`, `CustomData_1..5`).
- `process/` — start processing a loaded batch (cannot be stopped or added to afterwards).
- `getstatus/` — `{ BillingIdentifier, ListTransactions? }` → `Transmit_Pending/Failed`, `Deposit_Pending/Failed/Finished`, `Finished`.

## Upay / general billing — `/api/billing/generalbilling/`
- `openupayterminal/` — open an instant credit-card terminal via Upay aggregator. `{ BankCode, BranchCode, AccountNumber, Program }` (Program enum in `enums.md`).
- `setupaycredentials/` — `{ EmailAddress, Password }` to use an existing Upay account.

## Shva / terminal terminology
**Shva (שב"א)** is the Israeli interbank clearing switch. Each merchant has a `MerchantNumber`/terminal; SUMIT supports multiple terminals and foreign currencies. Israeli cards generally require **CitizenID** and **CVV**. J5 (`AuthorizeOnly`/`AutoCapture:false`) = hold without capture.
