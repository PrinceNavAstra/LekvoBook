# Lekvo Book

Modern cloud ledger and small-business management SaaS based on the supplied Cloud Ledger specification. The MVP establishes a clean SaaS dashboard, PostgreSQL/Prisma multi-tenant schema, transaction-based ledger APIs and a provider-ready notification model.

## Stack
Next.js, React, TypeScript, PostgreSQL, Prisma.

## Local setup
1. Copy .env.example to .env and set DATABASE_URL.
2. npm install
3. npx prisma migrate dev --name init
4. npm run dev

## Core MVP
Register/business foundations are represented in the schema; the current development UI bootstraps a demo business on first dashboard request. Customers and transactions are persisted in PostgreSQL. The next production step is centralized authentication/RBAC and encrypted provider configuration before exposing the app to real businesses.

The product specification requires cloud persistence, multi-tenancy, auditable transactions, configurable Email/SMS/WhatsApp providers and no provider credential changes in source code. The schema and architecture are structured for those phases.