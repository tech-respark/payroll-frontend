# Routes and permissions

> **Audience:** Product, QA, frontend/backend developers, support
> **Purpose:** Record current frontend route gates and important backend differences
> **Last verified:** 2026-10-24
> **Source of truth:** `App.jsx`, `Navigation.jsx`, screen checks, `@PreAuthorize`

## Navigation groups

Managers and admins (anyone with `VIEW_OTHER_STAFF`, `MANAGE_STAFF`, a `MANAGE_*` permission, `VIEW_REPORTS`, `VIEW_HR_DASHBOARD`, or hospitality access) see accordion groups (labels only; routes unchanged). `VIEW_ACTIVITY_LOG` only adds Activity log; it does not switch the user to operations Home or the admin sidebar.

- **Overview:** Home, Staff, Shifts, Attendance
- **Management:** Approvals, Leave, Payroll, Reports
- **Activity log** sits at the bottom of the destination list (when `VIEW_ACTIVITY_LOG`), above Documentation and logout

**Approvals** is visible with `MANAGE_LEAVES` or `MANAGE_ATTENDANCE` and stays an accordion so leave and regularization queues sit together. A group with only one destination (for example Shifts) renders as a direct link, not an accordion. Leave children are My Leaves plus setup screens (config and holidays). Shift-swap decisions stay on My Work; there is no dedicated swap-approval route.

Both navigations include a **Documentation** link in the sidebar footer (with logout), which opens `/docs` in a new tab. That footer link is the only product-shell entry to the help center. Theme is toggled from the account drawer, not the sidebar.

Staff-only users see the same sections as a flat list (no accordion):

- **Overview:** Home, Attendance, My Work
- **Management:** My Leaves, then Salary and Payslips when they have `VIEW_SALARY` or `MANAGE_SALARY`, then Claims and Loans (any signed-in user)
- **Profile** (`/staff`) sits at the bottom of the staff destination list, then Activity log when `VIEW_ACTIVITY_LOG`. Documentation and logout sit in the sidebar footer.

Icons use Lucide via `react-icons/lu` (for example Leave uses `LuCalendarOff`). The shell is a Hajiro layout (248px sidebar, 64px header, navy/blue/teal tokens). No third-party UI kit is required. Form toggles and choice controls should use shared `Checkbox` / `Switch` / `Radio` from `components/ui`.

## Frontend route matrix

| Route                  | Screen                   | Frontend requirement                   |
| ---------------------- | ------------------------ | -------------------------------------- |
| `/login`               | Login                    | Public/unauthenticated client staff    |
| `/ops/login`           | Ops login                | Public/unauthenticated platform users  |
| `/ops`                 | Ops clients              | Platform `superadmin` or `sales`       |
| `/ops/clients/new`     | Onboarding wizard        | Platform `superadmin` or `sales`       |
| `/ops/clients/:tenantId` | Client detail          | Platform `superadmin` or `sales`       |
| `/ops/products`        | Source product catalog   | Platform `superadmin` only             |
| `/ops/operators`       | Platform users           | Platform `superadmin` only             |
| `/ops/support-launch`  | Support handoff          | Public one-time code                   |
| `/ops/support-ended`   | Support ended            | Public                               |
| `/home`                | Home                     | Authenticated. Staff home or operations home. Data from `GET /home/staff` or `GET /home/operations` |
| `/activity`            | Activity log             | `VIEW_ACTIVITY_LOG` |
| `/docs`                | User help center home    | Authenticated; standalone docs chrome  |
| `/docs/:slug`          | User help article        | Authenticated; any signed-in user      |
| `/staff`               | Staff Details / Profile  | Authenticated. Staff self-view is titled Profile |
| `/roles`               | Roles & Permissions      | `MANAGE_ROLES`                         |
| `/shifts`              | Shift Management         | `VIEW_SHIFTS` or `MANAGE_SHIFTS`       |
| `/attendance`          | Attendance               | Authenticated                          |
| `/approvals`           | Regularization Approvals | `MANAGE_ATTENDANCE`                    |
| `/salary`              | Salary Management        | `VIEW_SALARY` or `MANAGE_SALARY`       |
| `/payslips`            | Payslips                 | `VIEW_SALARY` or `MANAGE_SALARY`       |
| `/pay-run`             | Pay run                  | `VIEW_SALARY` or `MANAGE_SALARY`       |
| `/claims`              | Claims                   | Authenticated                          |
| `/loans`               | Loans                    | Authenticated. Create/close need `MANAGE_SALARY` |
| `/settlements`         | Settlements              | `VIEW_SALARY` or `MANAGE_SALARY`       |
| `/hospitality`         | Hospitality Payroll      | `MANAGE_SALARY`, `VIEW_HOSPITALITY`, or `MANAGE_HOSPITALITY` |
| `/reports/payroll`     | Payroll cost             | `VIEW_SALARY`, `VIEW_REPORTS`, or `MANAGE_SALARY` |
| `/my-work`             | My Work                  | Authenticated                          |
| `/reports`             | Attendance Summary       | `VIEW_REPORTS`                         |
| `/reports/detailed`    | Staff Detailed Report    | `MANAGE_ATTENDANCE` or `MANAGE_SALARY` |
| `/hr-dashboard`        | Redirect to Home         | Authenticated; HR metrics render on Home when `VIEW_HR_DASHBOARD` |
| `/leave-dashboard`     | My Leaves                | Authenticated                          |
| `/leave-approvals`     | Leave Approvals          | `MANAGE_LEAVES`                        |
| `/leave-configuration` | Leave Config             | `MANAGE_LEAVES`                        |
| `/settings/holidays`   | Holiday Calendar         | `MANAGE_LEAVES`                        |

## Permission catalog used by the UI

Frontend `hasAccess` gates use these strings (they match `Permissions.java` unless noted):

- Staff directory: `VIEW_OTHER_STAFF`, `MANAGE_STAFF`
- Shifts: `VIEW_SHIFTS`, `MANAGE_SHIFTS`
- Attendance approvals: `MANAGE_ATTENDANCE`
- Salary / pay run / settlements: `VIEW_SALARY`, `MANAGE_SALARY`
- Roles: `MANAGE_ROLES`
- Leave setup and approvals: `MANAGE_LEAVES`
- Reports: `VIEW_REPORTS`
- Executive snapshot: `VIEW_HR_DASHBOARD`
- Hospitality: `VIEW_HOSPITALITY`, `MANAGE_HOSPITALITY`
- Activity: `VIEW_ACTIVITY_LOG`

`Permissions.java` also defines `VIEW_STAFF`, `VIEW_ATTENDANCE`, `VIEW_ROLES`, and `MANAGE_STORE_SETTINGS`. The UI does not gate routes on those four. Historical seed / `InsertData` labels such as `VIEW_LEAVES`, `MANAGE_REPORTS`, `MANAGE_HOLIDAYS`, `VIEW_HOLIDAYS`, `APPROVE_LEAVES`, and `APPROVE_ATTENDANCE` are not frontend gates. Do not infer enforcement from a seeded label.

Operations Home and the admin sidebar use the same gate list as `SecurityUtils.isOperationsUser()` / `homeAccess.OPS_GATES` (`VIEW_OTHER_STAFF`, `MANAGE_STAFF`, `MANAGE_*` listed above, `VIEW_REPORTS`, `VIEW_HR_DASHBOARD`, hospitality). `VIEW_ACTIVITY_LOG` is not in that list.

## Backend method enforcement

Strong class-level checks exist for:

- role administration: `MANAGE_ROLES`;
- leave-plan administration: `MANAGE_LEAVES`;
- shift controller: `MANAGE_SHIFTS`.

Selected salary, leave, trigger, sync, and store-hours methods have method-level checks. Remaining unannotated authenticated endpoints still need review.

## Known mismatches

1. Payroll children follow their routes: Salary and Payslips require `VIEW_SALARY` or `MANAGE_SALARY`. Hospitality-only roles see Hospitality Payroll, not a Salary link that would bounce to `/home`.
2. Shift GET/list endpoints accept `VIEW_SHIFTS` or `MANAGE_SHIFTS`; roster and slot writes still require `MANAGE_SHIFTS`.
3. `MANAGE_STAFF` now receives the full store directory (same as `VIEW_OTHER_STAFF`). Role list GET and assignment allow `MANAGE_STAFF`; role create/update still require `MANAGE_ROLES`. Callers without those authorities receive only their own personnel row.
4. HR dashboard “View Approvals” only links to `/leave-approvals` when the user has `MANAGE_LEAVES`.
5. Unknown or permission-denied routes redirect to `/home`.

QA must test both visibility and direct API access for every role. Backend authorization is the security boundary.
