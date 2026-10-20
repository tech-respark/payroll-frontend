# Client and sales guide

> **Audience:** Sales, pre-sales, client success, implementation leads  
> **Purpose:** Position and qualify the product without making unsupported promises  
> **Last verified:** 2026-10-19  
> **Source of truth:** [Product overview](product-overview.md) and current code

## Positioning

Relfor Payroll connects workforce records, time data, leave policy, and payroll processing for multi-location organizations. Its strongest fit is an organization that needs store-level operations, biometric attendance, configurable access, and a consolidated monthly payroll workflow.

## Discovery questions

1. How many companies, stores, and active employees are in scope?
2. Which biometric vendor is used? The current built-in handler is Team Office.
3. Is staff mastered in this product or imported from another system?
4. What is the salary-cycle start day and financial-year start month?
5. Which earnings, deductions, and formulas are required?
6. Which roles need access to other employees, salary, leave approvals, or reports?
7. Are RabbitMQ/WhatsApp and SMTP notifications required?
8. What historical attendance, leave, and payroll data must be migrated?
9. Which statutory calculations or filing outputs are expected? These require explicit validation and may be outside current scope.

## Demonstration flow

Use a non-production tenant with synthetic data.

1. Sign in and explain tenant/store context.
2. Show Staff Details and Roles & Permissions.
3. Define a shift and show the weekly roster.
4. Review an attendance calendar and regularization.
5. Apply and approve leave; show the balance ledger outcome.
6. Configure salary components and monthly variables.
7. Generate a payslip and attendance report.
8. Show HR metrics last; explain that permissions control visibility.

Do not demonstrate production credentials, vendor credentials, personal bank data, or real salary data.

## Verified differentiators

- Store-aware multi-tenant model
- Fine-grained permission strings attached to roles
- Shift and attendance data feeding payroll calculations
- Leave accrual and ledger model rather than only a mutable balance
- Formula-capable salary components with tenant/store scoping
- Biometric and external staff integration paths
- PDF payslip and CSV/report exports

## Implementation responsibilities

| Relfor/team responsibility | Client responsibility |
| --- | --- |
| Deploy and configure application services | Supply approved organization/store structure |
| Configure tenant, roles, salary components, schedules | Confirm policy, salary, holiday, and access rules |
| Map supported integrations | Provide test endpoints and credentials securely |
| Validate acceptance scenarios | Provide authorized test users and sign-off |
| Document production runbook | Own data accuracy and regulatory review |

## Statements to avoid

Do not claim automatic legal compliance, complete statutory filing, guaranteed support for every biometric device, scheduled external staff sync, fully isolated endpoint authorization, or automatic migration from arbitrary HR systems. Those are not all implemented or verified.

## Implementation acceptance

A client is ready for user acceptance testing when:

- tenant, stores, roles, and test users exist;
- permission and visibility checks pass;
- salary and leave policies have approved examples;
- biometric/external mapping uses stable identifiers;
- attendance-to-payroll reconciliation passes a representative month;
- backup, monitoring, credential storage, and support ownership are agreed.

See [tenant onboarding](../operations/tenant-onboarding.md) and [known limitations](../operations/known-limitations.md).
