# Lekvo Book

A modern cloud ledger for small businesses. Track what customers owe you, what you owe suppliers, payments, invoices, stock and expenses, from a phone, tablet or desktop browser.

Built from the Cloud Ledger specification: transaction-based accounting (balances are never overwritten), a multi-tenant PostgreSQL schema and a versioned REST API.

## What's in this version

- **Responsive everywhere.** Sidebar on desktop, icon rail on tablets, and a bottom bar with a centre **+** button on phones. Forms open as bottom sheets on phones and dialogs on larger screens.
- **Ledger-book design.** Entries are shown on a ruled ledger page with a margin line and "you gave / you got" columns. Light and dark themes, tabular figures for money, visible focus and reduced-motion support.
- **Dashboard.** What you will get and give, today's sales and expenses, a 7-day chart, pending payments and low-stock items.
- **Customers and suppliers.** Search, filters, live balances, a profile with full history, CSV statement download and a "Send reminder" button that opens WhatsApp with the message filled in.
- **Ledger, invoices, inventory, expenses, reports and settings**, all reading from and writing to the database.
- **Stock from movements.** Current stock is opening stock plus recorded movements, never a hand-edited number.

## Stack

Next.js 14 (App Router), React 18, TypeScript, PostgreSQL, Prisma.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. `npm install`
3. `npx prisma migrate dev --name init` (this version adds the `InventoryMovement` model, so run a migration if you already have a database)
4. `npm run dev`

The first request creates a demo business ("Astra Trading") so you can start adding customers straight away.

## Project layout

```
app/
  page.tsx               App shell, navigation and sheets
  components/            Dashboard, ledger page, lists, forms, shared UI
  api/v1/                REST routes: dashboard, customers, suppliers, transactions,
                         products, inventory, expenses, invoices, reports
lib/
  balances.ts            Customer and supplier balances from transactions
  stock.ts               Product stock from movements
  business.ts            Current-business lookup and error helper
  api.ts, format.ts      Client fetch helper and money/date formatting
prisma/schema.prisma     Multi-tenant schema
```

## How balances work

Every credit, sale, purchase, payment and adjustment is a row in `LedgerTransaction`. A balance is `opening balance + credits - debits`. The server decides the direction from the entry type, so the client cannot post a mismatched pair. Corrections should be made with a new adjustment entry rather than by editing history.

## Not built yet

This is still a pre-production foundation. Before real businesses use it:

- **Authentication and RBAC.** There is no sign-in yet. Every route resolves to the first business through `getCurrentBusiness()` in `lib/business.ts`; replace that one function with session-based lookup and check roles per route.
- **Communication providers.** The Email, SMS, WhatsApp and push settings screens are placeholders. Provider configuration with encrypted credentials, templates, rules and the notification queue are the next phase.
- **Payments, subscriptions and the admin panel.**
- **Invoice PDFs and editing.** Invoices can be created and listed; PDF export and status changes are not built.
- **Native apps.** The web app is fully responsive; the React Native and Tauri clients come later.
