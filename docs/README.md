# Payroll documentation

> **Audience:** Everyone working with or evaluating Relfor Payroll  
> **Purpose:** Central navigation and documentation ownership  
> **Last verified:** 2026-10-19  
> **Source of truth:** Current `payroll-frontend` and `payroll-backend` code

This portal follows a docs-as-code model. It separates product promises, user workflows, technical design, operational procedures, and known limitations so each audience can find reliable information quickly.

## Choose your path

| Audience | Start here | Use it for |
| --- | --- | --- |
| Client or stakeholder | [Product overview](product/product-overview.md) | Scope, modules, user roles, boundaries |
| Sales or pre-sales | [Client and sales guide](product/client-and-sales-guide.md) | Discovery, demos, integration positioning |
| Employee, manager, or HR user | [Feature guides](features/README.md) | Screen-by-screen workflows |
| Frontend or backend developer | [System architecture](architecture/system-architecture.md) | Components, data flow, implementation |
| Integration engineer | [Integrations](architecture/integrations.md) | Biometric, staff sync, messaging, email |
| API consumer | [API reference](reference/api-reference.md) | Methods, paths, authorization, response styles |
| DevOps or support | [Operations](operations/local-development.md) | Setup, configuration, runbooks, troubleshooting |
| Tenant implementation team | [Tenant onboarding](operations/tenant-onboarding.md) | Safe sequencing and acceptance checks |

## Product and client documentation

- [Product overview](product/product-overview.md)
- [Client and sales guide](product/client-and-sales-guide.md)
- [Personas and terminology](product/personas-and-glossary.md)

## Feature documentation

- [Feature index](features/README.md)
- [Staff and roles](features/staff-and-roles.md)
- [Shifts and attendance](features/shifts-and-attendance.md)
- [Leave and holidays](features/leave-and-holidays.md)
- [Payroll and payslips](features/payroll-and-payslips.md)
- [Reports and HR dashboard](features/reports-and-hr-dashboard.md)

## Architecture and engineering

- [System architecture](architecture/system-architecture.md)
- [Design system](architecture/design-system.md)
- Backend developer guide: `payroll-backend` repository, `docs/README.md`
- [Authentication, authorization, and tenancy](architecture/security-and-tenancy.md)
- [Data model](architecture/data-model.md)
- [External integrations and scheduled processing](architecture/integrations.md)

## Reference

- [API reference](reference/api-reference.md)
- [Routes and permissions](reference/routes-and-permissions.md)
- [Configuration reference](reference/configuration.md)

## Operations

- [Local development](operations/local-development.md)
- [Tenant onboarding](operations/tenant-onboarding.md)
- [Runbook and troubleshooting](operations/runbook-and-troubleshooting.md)
- [Known limitations and risks](operations/known-limitations.md)

## Maintaining these docs

See [documentation contribution standards](contributing/documentation.md). Run `npm run docs:check` before opening a pull request.

## Reliability labels

- **Implemented:** verified in current code.
- **Operational dependency:** implemented, but requires environment configuration or an external service.
- **Known limitation:** code exists but has an observed inconsistency, security concern, or incomplete path.
- **Not implemented:** do not present as available to clients.

Historical PDFs and text files are research inputs only. They are intentionally not copied into this repository because they contain stale schema names, incomplete procedures, and environment-specific secrets.
