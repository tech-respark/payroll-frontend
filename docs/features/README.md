# Feature guides

> **Audience:** End users, support, product, QA, developers  
> **Purpose:** Navigate verified product workflows by module  
> **Last verified:** 2026-10-20  
> **Source of truth:** Frontend routes/screens and called backend endpoints

## Modules

| Module | Routes | Guide |
| --- | --- | --- |
| Home | `/home` | [Home](home.md) |
| Activity log | `/activity` | [Activity log](activity-log.md) |
| Staff and access | `/staff`, `/roles` | [Staff and roles](staff-and-roles.md) |
| Shifts and attendance | `/shifts`, `/attendance`, `/approvals` (Regularization lives under the Approvals nav group) | [Shifts and attendance](shifts-and-attendance.md) |
| Leave and holidays | `/leave-dashboard`, `/leave-approvals` (Leave Approvals lives under the Approvals nav group), `/leave-configuration`, `/settings/holidays` | [Leave and holidays](leave-and-holidays.md) |
| Salary and payroll output | `/salary`, `/payslips` | [Payroll and payslips](payroll-and-payslips.md) |
| Hospitality payroll | `/hospitality`, `/my-work` | [Hospitality payroll](hospitality-payroll.md) |
| Analytics | `/reports`, `/reports/detailed` (HR snapshot lives on `/home`; `/hr-dashboard` redirects there) | [Reports and HR dashboard](reports-and-hr-dashboard.md) |
| User help center | `/docs`, `/docs/:slug` | [User help center](user-help-center.md) |

## Reading a feature guide

Each guide identifies:

- who can access the screen;
- the normal user workflow;
- APIs and persistent data involved;
- rules that affect calculations;
- observed limitations that support and QA must know.

Route visibility in the UI is not a substitute for backend authorization. See [authentication, authorization, and tenancy](../architecture/security-and-tenancy.md).
