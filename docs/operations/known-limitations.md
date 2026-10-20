# Known limitations and risks

> **Audience:** Engineering, product, sales, implementation, security, operators  
> **Purpose:** Prevent observed gaps from becoming undocumented promises  
> **Last verified:** 2026-10-19  
> **Source of truth:** Static code/schema audit and verified local runtime

Severity is an engineering prioritization aid, not a production certification.

## Security and authorization

- **Critical:** Secrets and a JWT signing value exist in tracked backend source/configuration. Rotate and externalize them.
- **High:** Many sensitive endpoints are JWT-only and do not enforce the permission suggested by the UI.
- **High:** Tenant/store/staff ownership enforcement is incomplete on several request-supplied IDs.
- **High:** Password update and reset paths need security hardening; historical review found inconsistent hashing/token handling.
- **High:** External sync creates users with a predictable initial credential.
- **Medium:** `/actuator/**` is publicly permitted by the security matcher.
- **Medium:** Browser session data is stored in `localStorage`.

## Permission and navigation mismatches

- **Resolved (2026-10-19):** Lazy-loaded report screens (`/reports`, `/reports/detailed`) previously crashed with a blank page because Vite served a second React copy for `@tanstack/react-table`. `vite.config.js` now dedupes React and pre-bundles the table package.
- Reports route uses `VIEW_REPORTS`; navigation requires attendance or salary management.
- Shifts route permits view authority; backend shift controller requires management authority.
- `MANAGE_STAFF` and `VIEW_OTHER_STAFF` produce inconsistent directory/filter behavior.
- Protected unknown routes can show blank content.
- HR dashboard links can target screens the user cannot access.

## Data and schema

- No versioned migration framework; Hibernate uses `ddl-auto=update`.
- JPA `salaryAmount` naming differs from dump `salary_amount`.
- Historical `staff_id`, `personnel_code`, and primary-key usage is inconsistent.
- Leave enrollment uniqueness differs between annotation and table intent.
- Loose SQL files are partial/stale relative to entities and dump.
- Formula definition `absentPenalty` has no supplied rule.

## UI and theming

- **Resolved (2026-10-19):** Core chrome migration to the Minimal-inspired design system is complete for navigation, tokens, shared primitives (`Button`, `Input`, `Card`, `Badge`, `Modal`, `Drawer`, `Checkbox`, `Switch`, `Radio`), and high-traffic screens. Remaining UI work is feature-specific (new fields, layouts, or flows), not shell or primitive gaps. See [design system](../architecture/design-system.md).
- Prefer `var(--primary-color)` for primary actions — never `var(--text-dark)` as a button fill (that token is white in dark mode).
- Shared overlay primitives live in `components/ui` (`Modal` for focused dialogs, `Drawer` for create/edit side panels). Prefer them over one-off `modalOverlay` markup when touching a screen. Body scroll is locked while either is open; the authenticated shell scrolls only inside `main.content`.
- Shared form controls also live in `components/ui` (`Checkbox`, `Switch`, `Radio`). Use `Switch` for on/off settings (for example staff active, role permissions, optional holiday), `Checkbox` for multi-select lists, and `Radio` (including `card`) for exclusive choices such as leave session.
- Holiday Calendar is a month/list calendar with a right Drawer for create (not a center modal). Pagination controls in the old table footer were removed with the calendar rebuild.
- Header notifications (`NotificationsDrawer`) are an approval inbox only (pending leave + regularization counts). For `VIEW_HR_DASHBOARD`, leave counts come from `/admin/dashboard/metrics` because `/leaves/applications/pending` can return an empty list while metrics still report pending work. There is no push/realtime channel or personal status feed in the UI.

## Feature behavior

- Shift store-settings panel exists but is unreachable from current tabs.
- Some UI compliance/health/broadcast labels are static.
- Leave manager ID and some staff-ID fallbacks use fixed values.
- Payslip PDF role header expects role objects while login returns strings.
- The UI does not expose the backend Excel payslip endpoint.
- Report response parsing differs between screens.
- SMS service is a stub.

## Operations and reliability

- Schedulers run in-process without documented distributed locking.
- The attendance scheduler advances a due row only after successful retrieval. Its selection window looks back only one hour, so an older failure is not retried until its invocation time is corrected. A source comment still says the default interval is two minutes; the property default is 20 minutes.
- External staff sync is manual/on demand, not scheduled.
- Response envelopes are inconsistent and there is no OpenAPI document.
- Automated coverage is thin: no frontend tests and one discovered backend unit-test class.
- Broker, SMTP, and vendor failures are not covered by a consolidated health/readiness contract.

## Documentation rule

Do not remove an item because it is inconvenient for client communication. Remove or downgrade it only when a code change and verification evidence resolve it. Product and sales material must link to current scope and avoid claims contradicted here.
