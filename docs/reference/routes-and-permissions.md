# Routes and permissions

> **Audience:** Product, QA, frontend/backend developers, support
> **Purpose:** Record current frontend route gates and important backend differences
> **Last verified:** 2026-10-20
> **Source of truth:** `App.jsx`, `Navigation.jsx`, screen checks, `@PreAuthorize`

## Navigation groups

Sidebar groups (labels only; routes unchanged):

- **Overview:** Staff, Shifts, Attendance
- **Management:** Payroll, Reports, Leave

Icons use Lucide via `react-icons/lu` (for example Leave uses `LuCalendarOff`). The shell is a custom Minimal-inspired layout (280px sidebar, 64px header, light-first theme tokens). No third-party UI kit is required. Form toggles and choice controls should use shared `Checkbox` / `Switch` / `Radio` from `components/ui`.

## Frontend route matrix

| Route                  | Screen                   | Frontend requirement                   |
| ---------------------- | ------------------------ | -------------------------------------- |
| `/login`               | Login                    | Public/unauthenticated                 |
| `/staff`               | Staff Details            | Authenticated                          |
| `/roles`               | Roles & Permissions      | `MANAGE_ROLES`                         |
| `/shifts`              | Shift Management         | `VIEW_SHIFTS` or `MANAGE_SHIFTS`       |
| `/attendance`          | Attendance               | Authenticated                          |
| `/approvals`           | Regularization Approvals | `MANAGE_ATTENDANCE`                    |
| `/salary`              | Salary Management        | `VIEW_SALARY` or `MANAGE_SALARY`       |
| `/payslips`            | Payslips                 | `VIEW_SALARY` or `MANAGE_SALARY`       |
| `/reports`             | Attendance Summary       | `VIEW_REPORTS`                         |
| `/reports/detailed`    | Staff Detailed Report    | `MANAGE_ATTENDANCE` or `MANAGE_SALARY` |
| `/hr-dashboard`        | HR Dashboard             | `VIEW_HR_DASHBOARD`                    |
| `/leave-dashboard`     | My Leaves                | Authenticated                          |
| `/leave-approvals`     | Leave Approvals          | `MANAGE_LEAVES`                        |
| `/leave-configuration` | Leave Config             | `MANAGE_LEAVES`                        |
| `/settings/holidays`   | Holiday Calendar         | `MANAGE_LEAVES`                        |

## Permission catalog used by the UI

- Staff: `VIEW_STAFF`, `VIEW_OTHER_STAFF`, `MANAGE_STAFF`
- Shifts: `VIEW_SHIFTS`, `MANAGE_SHIFTS`
- Attendance: `VIEW_ATTENDANCE`, `MANAGE_ATTENDANCE`
- Salary: `VIEW_SALARY`, `MANAGE_SALARY`
- Roles: `VIEW_ROLES`, `MANAGE_ROLES`
- Leave: `VIEW_LEAVES`, `MANAGE_LEAVES`
- Reports: `VIEW_REPORTS`, `MANAGE_REPORTS`
- Executive: `VIEW_HR_DASHBOARD`
- Backend constant also defines `MANAGE_STORE_SETTINGS`

Additional permission strings appear in historical seed data but are not consistently implemented as controller checks. Do not infer enforcement from a seeded label.

## Backend method enforcement

Strong class-level checks exist for:

- role administration: `MANAGE_ROLES`;
- leave-plan administration: `MANAGE_LEAVES`;
- shift controller: `MANAGE_SHIFTS`.

Selected salary, leave, trigger, sync, and store-hours methods have method-level checks. Remaining unannotated authenticated endpoints still need review.

## Known mismatches

1. `/reports` route requires `VIEW_REPORTS`, while the navigation group is visible with attendance or salary management.
2. Shift GET/list endpoints accept `VIEW_SHIFTS` or `MANAGE_SHIFTS`; roster and slot writes still require `MANAGE_SHIFTS`.
3. `MANAGE_STAFF` now receives the full store directory (same as `VIEW_OTHER_STAFF`). Role list GET and assignment allow `MANAGE_STAFF`; role create/update still require `MANAGE_ROLES`. Callers without those authorities receive only their own personnel row.
4. HR dashboard “View Approvals” only links to `/leave-approvals` when the user has `MANAGE_LEAVES`.
5. Unknown or permission-denied routes redirect to `/staff`.

QA must test both visibility and direct API access for every role. Backend authorization is the security boundary.
