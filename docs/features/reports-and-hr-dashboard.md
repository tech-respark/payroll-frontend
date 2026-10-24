# Reports and HR dashboard

> **Audience:** Managers, HR, payroll, sales demos, support, developers  
> **Purpose:** Explain current reporting and executive metrics  
> **Last verified:** 2026-10-24  
> **Source of truth:** Report/HR screens and shift/report services

## Attendance Summary (`/reports`)

The route and sidebar **Attendance Summary** link both require `VIEW_REPORTS`. The Reports group also appears when the user has `MANAGE_ATTENDANCE` or `MANAGE_SALARY` so **Staff Detailed Report** is reachable.

Capabilities:

- date-range attendance summary of hours planned vs hours punched;
- sortable/filterable table;
- staff name links to `/reports/detailed?staffId=&from=&to=` so the detail range matches the summary;
- CSV export;
- automatic initial query plus manual refresh.

## Staff Detailed Report (`/reports/detailed`)

Requires `MANAGE_ATTENDANCE` or `MANAGE_SALARY`. From/to initialize from the summary URL. Empty copy is “No rostered shifts…”. SQL failures surface instead of an empty table.

Both report screens call endpoints hosted in the shift controller. Those report POSTs allow `VIEW_REPORTS`, `MANAGE_ATTENDANCE`, `MANAGE_SALARY`, or `MANAGE_SHIFTS`. Detailed queries resolve staff through `StaffIdentityService.rosterKeysForStaffId` (`ss.staff_id IN (:staffIds)`), LEFT JOIN store mapping (no `application_name='RESPARK'` inner join), and rethrow SQL errors.

## Payroll cost (`/reports/payroll`)

Visible with `VIEW_SALARY`, `VIEW_REPORTS`, or `MANAGE_SALARY`. Month and year load `GET /payroll/cost` (headcount, earnings, deductions, net). Operational total only — not a statutory filing.

## HR snapshot on Home (`/home`, formerly `/hr-dashboard`)

Requires `VIEW_HR_DASHBOARD`. `/hr-dashboard` redirects to Home. Operations Home loads `GET /home/operations`, which reuses this snapshot when `includeSnapshot` is true, and presents metrics and shortcuts related to:

- staff;
- attendance;
- leave approvals;
- high-level workforce status.

The metrics endpoint uses JWT tenant/store (`SecurityUtils`) and counts both `PENDING` and `CANCELLATION_REQUESTED`. “View Approvals” opens `/leave-approvals` only when the user has `MANAGE_LEAVES`. Attendance today is shown as “% of rostered staff punched today”, not a decorative Healthy tag.

## Reporting boundaries

- Reports are operational summaries, not statutory payroll filings.
- CSV is implemented on the attendance summary screen.
- Report screens unwrap `{ data: [] }` the same way.
- Dashboard shortcut visibility is not independently checked against the permission required by the destination route.

Use the [API reference](../reference/api-reference.md) for endpoint contracts and [known limitations](../operations/known-limitations.md) for access mismatches.
