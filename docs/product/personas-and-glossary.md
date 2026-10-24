# Personas and glossary

> **Audience:** All readers  
> **Purpose:** Establish shared product language  
> **Last verified:** 2026-10-24  
> **Source of truth:** UI terminology, backend entities, and database schema

## Personas

| Persona | Typical responsibilities | Common permissions |
| --- | --- | --- |
| Employee | Own attendance, regularization, leave, payslip | Baseline authenticated access, optional view permissions |
| Store manager | Team schedules and approvals | `VIEW_OTHER_STAFF`, `MANAGE_SHIFTS`, `MANAGE_ATTENDANCE`, `MANAGE_LEAVES` |
| HR administrator | Staff, roles, policies, holidays | `MANAGE_STAFF`, `MANAGE_ROLES`, `MANAGE_LEAVES`, `VIEW_HR_DASHBOARD` |
| Payroll administrator | Salary setup, payroll, payroll reports | `VIEW_SALARY`, `MANAGE_SALARY`, `VIEW_REPORTS` |
| Operator | Tenant provisioning and runtime support | Internal `/ops` platform user with role `superadmin` or `sales`. Not a client `s_role`. |

These are templates, not hardcoded roles. Actual access comes from authority strings returned at login.

## Core terms

- **Platform user:** An internal ops account in `platform_user` (`superadmin` or `sales`). Separate from `personnel_details`.
- **License:** Current commercial record in `tenant_subscription` (dates, status, plan, caps, salesperson).
- **Tenant:** A client company. Stored in `tenant_company_mapping`.
- **Source product:** The software the client came from (`platform_product`, assigned on `tenant_company_mapping.product_id`). The catalog is open: first-party or third-party, billing or other categories. Payroll stays standalone until a connector is built.
- **Store:** A branch, office, or location belonging to a tenant. Stored in `store_details`.
- **Staff ID:** Unless an endpoint says otherwise, the database primary key `personnel_details.id`.
- **Employee code:** External or HR identifier stored in `personnel_details.employee_code`; it is not interchangeable with Staff ID.
- **Personnel code:** A legacy numeric identifier found in parts of the schema. Current services do not use it consistently.
- **Role:** A tenant-scoped named permission bundle in `s_role`.
- **Permission:** A flat authority string such as `MANAGE_LEAVES`.
- **Shift slot:** Reusable schedule definition in `shift_slots`.
- **Roster:** Assignment of shifts to staff over dates.
- **Raw attendance:** Individual punch events in `personnel_attendance`.
- **Daily summary:** Per-person, per-day attendance classification and calculated time.
- **Monthly summary:** Payroll-cycle aggregation consumed by salary calculation.
- **Regularization:** A requested or administrative correction to attendance.
- **Leave plan:** A set of leave rules assigned to staff.
- **Leave ledger:** Append-style additions and deductions used to derive leave balance.
- **Salary component:** Earning or deduction, fixed or formula-based.
- **Payslip history:** Persisted monthly payroll result. PDF is generated on demand rather than stored as a PDF column.
- **Pay run:** Store-month workflow: calculate, skip, submit, approve, publish, lock.
- **Core line:** Payslip earning or deduction prefixed `Core:` (reimbursement, loan EMI, PF, ESI, PT, TDS, LWF).
- **Global component:** A salary component with `store_id = 0`, available to stores in the tenant when repository fallback applies.
- **Payroll lock date:** `store_details.payrollLockedUpToDate` — Monthly Variables cannot be edited through this date. Payslips still show locked months.
- **Attendance cursor:** `store_details.recent_summary_calculated_month` — Payslips hide later months in the current year as not calculated. Home pay month is the latest `personnel_payslip_history` row, not this cursor.
- **Unrostered:** Day with no assigned shift. UI copy is **No rostered shift**; the day status can be `Unrostered`. Hours are not invented.

## Status vocabulary

- Leave application: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLATION_REQUESTED`, `CANCELLED`
- Attendance regularization: `PENDING`, `APPROVED`, `REJECTED`
- Attendance day category: `PRESENT`, `ABSENT`, `HALF_DAY`, `ON_LEAVE`, `WEEKLY_OFF`, `HOLIDAY`, `SPLIT`, `Unrostered`
- Leave ledger transaction: `ALLOCATION`, `ACCRUAL`, `DEBIT_LEAVE`, `EXPIRY`, `ADJUSTMENT`

Use these exact values in technical documentation and integration examples.
