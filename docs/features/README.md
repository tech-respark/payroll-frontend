# Feature guides

> **Audience:** End users, support, product, QA, developers  
> **Purpose:** Navigate verified product workflows by module  
> **Last verified:** 2026-10-20  
> **Source of truth:** Frontend routes/screens and called backend endpoints

## Modules

| Module | Routes | Guide |
| --- | --- | --- |
| Staff and access | `/staff`, `/roles` | [Staff and roles](staff-and-roles.md) |
| Shifts and attendance | `/shifts`, `/attendance`, `/approvals` | [Shifts and attendance](shifts-and-attendance.md) |
| Leave and holidays | `/leave-dashboard`, `/leave-approvals`, `/leave-configuration`, `/settings/holidays` | [Leave and holidays](leave-and-holidays.md) |
| Salary and payroll output | `/salary`, `/payslips` | [Payroll and payslips](payroll-and-payslips.md) |
| Hospitality payroll | `/hospitality`, `/my-work` | [Hospitality payroll](hospitality-payroll.md) |
| Analytics | `/reports`, `/reports/detailed`, `/hr-dashboard` | [Reports and HR dashboard](reports-and-hr-dashboard.md) |

## Reading a feature guide

Each guide identifies:

- who can access the screen;
- the normal user workflow;
- APIs and persistent data involved;
- rules that affect calculations;
- observed limitations that support and QA must know.

Route visibility in the UI is not a substitute for backend authorization. See [authentication, authorization, and tenancy](../architecture/security-and-tenancy.md).
