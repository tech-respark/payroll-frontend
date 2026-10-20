# Relfor Payroll

Relfor Payroll is a multi-tenant HR, attendance, leave, shift, and payroll application. This repository contains the React frontend; the Spring Boot API is maintained in the sibling `payroll-backend` repository.

## Documentation

Start at the [documentation portal](docs/README.md).

- [Product overview](docs/product/product-overview.md) — what the platform does and who it serves
- [Client and sales guide](docs/product/client-and-sales-guide.md) — positioning, implementation scope, and qualification
- [Feature guides](docs/features/README.md) — workflows grouped by product module
- [System architecture](docs/architecture/system-architecture.md) — components and request/data flows
- [API reference](docs/reference/api-reference.md) — verified HTTP surface
- [Local development](docs/operations/local-development.md) — run the complete stack
- [QA and production deployment](docs/operations/qa-and-production-deployment.md) — secrets, proxy, QA checks, production controls
- [Tenant onboarding](docs/operations/tenant-onboarding.md) — controlled setup checklist
- [Known limitations](docs/operations/known-limitations.md) — verified gaps and risks

Backend-only setup, package layout, and request flow live in the sibling `payroll-backend` repository under `docs/README.md`.

## Quick start

Prerequisites: Node.js, Java 21, MySQL 8, the backend repository, and a local HTTPS keystore.

```bash
# Frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5174` and proxies `/payroll-management/v1` to `https://localhost:8092`. See [local development](docs/operations/local-development.md) for database and backend setup.

## Common commands

```bash
npm run dev          # Start Vite on port 5174
npm run build        # Create the production bundle
npm run preview      # Preview the bundle
npm run docs:check   # Validate documentation links and safety rules
```

## Repository boundaries

- `payroll-frontend`: React UI, this documentation portal, client-side route gates
- `payroll-backend`: API, JWT security, business logic, schedulers, persistence, integrations
- MySQL `payroll_management`: tenant, staff, attendance, leave, salary, and payroll data

The two Git repositories remain independently versioned and deployed. A multi-root Cursor workspace can open them together without combining their histories.

## Documentation policy

Code is authoritative when documentation and behavior differ. Every product change that affects routes, permissions, APIs, database entities, configuration, or operations must update the relevant page in the same change. Never add credentials, personal data, production URLs, tokens, or database dumps to documentation.
