# Known limitations and risks

> **Audience:** Engineering, product, sales, implementation, security, operators  
> **Purpose:** Prevent observed gaps from becoming undocumented promises  
> **Last verified:** 2026-10-20  
> **Source of truth:** Static code/schema audit and verified local runtime

Severity is an engineering prioritization aid, not a production certification.

## Security and authorization

- **Resolved (2026-10-20):** Tracked `application.properties` no longer contains credential defaults. JWT signing uses `jwt.secret` / `JWT_SECRET` (minimum 32 bytes) and fails closed at startup. Local values belong in gitignored `application-local.properties`.
- **Resolved (2026-10-20):** Public matcher is login, forgot-password, CORS preflight, and `/actuator/health` only. Remaining actuator routes require authentication. Exposed actuator endpoints are `health` only.
- **Resolved (2026-10-20):** Staff-scoped leave, payslip, salary-component, attendance history, regularization, and directory reads enforce self-or-manager ownership. Password updates require `MANAGE_STAFF`. Role catalog GET requires `MANAGE_ROLES` or `MANAGE_STAFF`.
- **Resolved (2026-10-20):** Password reset hashes OTPs, stores a SHA-256 reset token, uses `SecureRandom`, returns a generic OTP message, rejects inactive logins, and requires a minimum password length of 8.
- **Resolved (2026-10-20):** Attendance retrieve and monthly-summary triggers require `MANAGE_ATTENDANCE`. Salary calculate trigger requires `MANAGE_SALARY`. Store-hours POST requires `MANAGE_SHIFTS` or `MANAGE_STORE_SETTINGS`. External staff sync POST requires `MANAGE_STAFF`.
- **Resolved (2026-10-20):** New externally synced users receive a random password hash. They cannot log in until an admin sets a password or they complete forgot-password.
- **Resolved (2026-10-20):** CORS origins come from `CORS_ALLOWED_ORIGINS` (localhost defaults only). Attendance and leave schedulers take a database lock so a second JVM skips the run. Leave accrual skips a period that already has an `ACCRUAL` row.
- **High:** Previously leaked secrets must still be rotated in every environment that used the old source defaults.
- **Medium:** Browser session data is stored in `localStorage`.
- **Medium:** Tenant/store ownership is still request-plus-JWT rather than database row-level security.

## Permission and navigation mismatches

- **Resolved (2026-10-19):** Lazy-loaded report screens (`/reports`, `/reports/detailed`) previously crashed with a blank page because Vite served a second React copy for `@tanstack/react-table`. `vite.config.js` now dedupes React and pre-bundles the table package.
- **Resolved (2026-10-20):** A 403 from a permitted screen no longer wipes the session; only 401 logs the user out. Unauthenticated API calls (missing/invalid JWT) return 401; authenticated permission denials return 403.
- **Resolved (2026-10-20):** Shift GET endpoints accept `VIEW_SHIFTS` or `MANAGE_SHIFTS`; writes stay `MANAGE_SHIFTS`. Report POSTs accept `VIEW_REPORTS`, `MANAGE_ATTENDANCE`, `MANAGE_SALARY`, or `MANAGE_SHIFTS`.
- **Resolved (2026-10-20):** `MANAGE_STAFF` sees the full store directory (same as `VIEW_OTHER_STAFF`). Role list GET is authenticated; role create/update still require `MANAGE_ROLES`; assign allows `MANAGE_STAFF`.
- **Resolved (2026-10-20):** Unknown or permission-denied routes redirect to `/home`.
- **Resolved (2026-10-20):** HR dashboard “View Approvals” goes to `/leave-approvals` only with `MANAGE_LEAVES`.
- **Resolved (2026-10-20):** Payroll sidebar children match their routes. Hospitality-only roles no longer see Salary or Payslips links that bounced to `/home`. `VIEW_ACTIVITY_LOG` is an Activity route gate only, not an operations-home gate.

## Data and schema

- No versioned migration framework; Hibernate uses `ddl-auto=update`.
- JPA `salaryAmount` naming differs from dump `salary_amount`.
- Historical `staff_id` rows may store `personnel_code` instead of `personnel_details.id`. Roster GET and staff reports now resolve both keys to canonical `personnel_details.id`. New writes should keep using `id`.
- Leave enrollment uniqueness differs between annotation and table intent.
- Loose SQL files are partial/stale relative to entities and dump.
- Formula definition `absentPenalty` has no supplied rule.

## UI and theming

- **Resolved (2026-10-20):** Product tokens follow Hajiro v1 (navy / blue / teal). Primary actions are blue `#2477D4`; teal is an accent only. Product name and logo files are unchanged. See [design system](../architecture/design-system.md).
- Prefer `var(--primary-color)` for primary actions — never `var(--text-dark)` as a button fill (it becomes light in dark mode).
- Shared overlay primitives live in `components/ui` (`Modal` for focused dialogs, `Drawer` for create/edit side panels). Prefer them over one-off `modalOverlay` markup when touching a screen. Body scroll is locked while either is open; the authenticated shell scrolls only inside `main.content`.
- Shared form controls also live in `components/ui` (`Checkbox`, `Switch`, `Radio`). Use `Switch` for on/off settings (for example staff active, role permissions, optional holiday), `Checkbox` for multi-select lists, and `Radio` (including `card`) for exclusive choices such as leave session.
- Holiday Calendar is a month/list calendar with a right Drawer for create (not a center modal). Pagination controls in the old table footer were removed with the calendar rebuild.
- Header notifications (`NotificationsDrawer`) are an approval inbox only (pending leave + regularization counts). For `VIEW_HR_DASHBOARD`, leave counts come from `/admin/dashboard/metrics` because `/leaves/applications/pending` can return an empty list while metrics still report pending work. There is no push/realtime channel or personal status feed in the UI.

- Activity log starts empty until new mutations occur; it does not backfill older leave, role, or payroll rows. `leave_application_logs` remains a leave-workflow table, not the store-wide history.
- Existing roles receive `VIEW_ACTIVITY_LOG` only when they already have `MANAGE_ROLES` or `VIEW_HR_DASHBOARD`. Other roles must be granted it on Roles & Permissions, then the user must sign in again.
- Not every legacy POST is captured (for example report exports, appointment booked-slot writes, and break-time writes). Unknown-username sign-in failures are stored without a store, so they do not appear in the store activity log. New product work should call `ActivityRecorder`.

## Feature behavior

- **Resolved (2026-10-20):** `GET /staffshifts?date=` no longer joins `personnel_details.staff_id` (that column does not exist). Weekly and date roster reads use `staff_shifts` only.
- **Resolved (2026-10-20):** Roster and report queries treat `staff_shifts.staff_id` as either `personnel_details.id` or `personnel_code` and return canonical `personnel_details.id`, so named staff appear in weekly/report views.
- **Resolved (2026-10-20):** Hospitality shift-swap approval looks up roster rows by both `personnel_details.id` and `personnel_code`, matching weekly roster reads.
- **Resolved (2026-10-20):** Hospitality store tools require `MANAGE_SALARY`, `VIEW_HOSPITALITY`, or `MANAGE_HOSPITALITY`. Floor staff with only `VIEW_SALARY` use My Work for their own clock, availability, and swaps. Advance recovery is idempotent per payslip month.
- **Resolved (2026-10-20):** `GET /leaves/types/{staffId}` returns mapped leave-type fields instead of Hibernate proxies (Jackson no longer 500s).
- **Resolved (2026-10-20):** In/out history APIs require `staffIds`. A missing list returns `400` instead of a SQL `IN null` 500. Pending-leave cancel returns `Leave cancelled successfully` so the employee toast matches the immediate cancel path.
- **Resolved (2026-10-20):** `@PreAuthorize` denials return HTTP 403 instead of being swallowed as a generic 500. Staff cannot apply leave for another person. Holiday create/delete require `MANAGE_LEAVES`. HR metrics require `VIEW_HR_DASHBOARD`.
- **Resolved (2026-10-20):** Shift **Store Hours** tab is reachable for `MANAGE_SHIFTS`. Store open/close is read from the settings object, not treated as an array.
- **Resolved (2026-10-20):** Salary no longer shows a static “Compliance Check Passed” chip.
- Some remaining UI health/broadcast labels are static.
- **Resolved (2026-10-20):** Leave/attendance actor IDs use `user.staffId` from login/JWT. Fallback `1` was removed.
- **Resolved (2026-10-20):** Payslip PDF download sends `staffId` as `Userid`. `RoleId` is not a login field; the header is a legacy unused value (`2`).
- The UI does not expose the backend Excel payslip endpoint.
- **Resolved (2026-10-20):** Report screens unwrap `{ data: [] }` the same way and never treat a phone number as `staffId`.
- SMS service is a stub.
- Hospitality statutory lines are payslip calculations only. They do not generate or submit PF ECR, ESI challan, or Form 16 files.
- Hospitality sales import is manual or JSON. There is no live Petpooja, POSist, Invoay, or Salonist connector.
- Hospitality clock-in stores a geo note only. Selfie images are not captured.
- WhatsApp payslip send uses the existing RabbitMQ notification path and is skipped when the broker is down.
- **Resolved (2026-10-20):** Monthly Variables save to month-scoped payslip history through `/monthlyCalculationComponents`. Footer totals use `monthlyValue` (with annual/12 fallback) so month-scoped rows do not render as NaN.
- The payslip month picker disables months after `store_details.recent_summary_calculated_month`. That field is advanced by the vendor attendance handler, not by on-demand `/trigger/calculateMonthWiseSummary`.

## Operations and reliability

- Schedulers run in-process. A `scheduler_lock` row now prevents overlapping runs of the same job; two instances still should not be the normal production topology.
- The attendance scheduler advances a due row only after successful retrieval. Its selection window looks back only one hour, so an older failure is not retried until its invocation time is corrected. A source comment still says the default interval is two minutes; the property default is 20 minutes.
- External staff sync is manual/on demand, not scheduled.
- Response envelopes are inconsistent and there is no OpenAPI document.
- Automated coverage is thin: no frontend tests and one discovered backend unit-test class.
- Broker, SMTP, and vendor failures are not covered by a consolidated health/readiness contract.

## Documentation rule

Do not remove an item because it is inconvenient for client communication. Remove or downgrade it only when a code change and verification evidence resolve it. Product and sales material must link to current scope and avoid claims contradicted here.
