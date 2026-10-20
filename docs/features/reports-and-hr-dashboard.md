# Reports and HR dashboard

> **Audience:** Managers, HR, payroll, sales demos, support, developers  
> **Purpose:** Explain current reporting and executive metrics  
> **Last verified:** 2026-10-19  
> **Source of truth:** Report/HR screens and shift/report services

## Attendance Summary (`/reports`)

The route requires `VIEW_REPORTS`, but the navigation group is currently shown only to users with `MANAGE_ATTENDANCE` or `MANAGE_SALARY`. A user with only `VIEW_REPORTS` can therefore have route access without a sidebar link.

Capabilities:

- date-range attendance summary;
- sortable/filterable table;
- CSV export;
- automatic initial query plus manual refresh.

## Staff Detailed Report (`/reports/detailed`)

Requires `MANAGE_ATTENDANCE` or `MANAGE_SALARY`. It selects a staff member and period, then retrieves detailed shift/attendance report data.

Both report screens call endpoints hosted in the shift controller, whose class-level backend permission is currently `MANAGE_SHIFTS`. Permission alignment must be tested for each production role.

## HR Dashboard (`/hr-dashboard`)

Requires `VIEW_HR_DASHBOARD` in the frontend. It presents metrics and shortcuts related to:

- staff;
- attendance;
- leave approvals;
- high-level workforce status.

The metrics endpoint accepts tenant/store headers and currently defaults missing values. Some labels such as “Healthy” are static presentation, not a configured threshold.

## Reporting boundaries

- Reports are operational summaries, not statutory payroll filings.
- CSV is implemented on the attendance summary screen.
- Detailed report response envelopes are not fully consistent with summary responses.
- Dashboard shortcut visibility is not independently checked against the permission required by the destination route.

Use the [API reference](../reference/api-reference.md) for endpoint contracts and [known limitations](../operations/known-limitations.md) for access mismatches.
