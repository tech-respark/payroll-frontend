# Authentication, authorization, and tenancy

> **Audience:** Developers, architects, security reviewers, operators  
> **Purpose:** Document implemented controls and verified gaps  
> **Last verified:** 2026-10-24  
> **Source of truth:** Security configuration, JWT classes, role loading, frontend auth context

## Authentication

Client `/login` accepts username or email plus password for `personnel_details` only. A successful client login writes `last_login_at`; a support-session handoff does not. Platform `/ops/login` authenticates `platform_user` only. A platform username on client login fails with the same generic 401. Client login also fails when `tenant_subscription` is missing a usable `TRIAL`/`ACTIVE` window that has already started and has not ended (existing tenants without a row still pass until ops writes one). Superadmin can mint a 30-minute client support session for one staff member; a one-time handoff code opens it in a new tab and the session can be revoked. Sales users only see tenants they own. Superadmin maintains an open source-product catalog (`platform_product`); sales can assign an active product on a tenant they own but cannot add or deactivate catalog rows. The catalog is a label only. Payroll does not sync to those products yet.

If the staff record has `totpEnabled`, `/login` returns `requires2fa` and a 5-minute `challengeToken` instead of a JWT. `POST /login/verify-2fa` then issues the session. Authenticator setup is self-service at `/payroll/me/totp/*`.

Login accepts username or email plus password. Passwords are matched with BCrypt. Inactive accounts are rejected with the same 401 message as invalid credentials. On success the API issues an HS256 JWT containing username, `tenantId`, and `storeId`. Token lifetime is `jwt.expiration-ms` (default ten hours). The signing secret is `jwt.secret` / `JWT_SECRET` and must be at least 32 bytes; the process fails to start if it is missing or too short.

The frontend stores `jwtToken` and the login response in `localStorage`, sends `Authorization: Bearer <token>`, and clears the session on non-login **401** responses. A **403** stays signed in and surfaces a permission error. Missing, expired, or invalid JWTs are unauthenticated and return **401**. Denied authorities on an authenticated request return **403**. Inactive users cannot keep using an old token; the JWT filter requires `UserDetails.isEnabled()`. `JwtAuthFilter` reloads `UserDetails` from the database on every request, so revoked roles take effect immediately on the API. The UI also calls `GET /session` on load and when the tab becomes visible to refresh `user.roles` without waiting for a new sign-in.

Public backend paths are client login, `/ops/login`, `/ops/support-handoff/{code}`, forgot-password routes, CORS preflight, and `/actuator/health`. All other paths, including remaining actuator routes, require an authenticated request. Platform JWTs include `principalType=PLATFORM` and `opsRole`. They cannot call client APIs. Client JWTs cannot call `/ops/**` except the public handoff. Support JWTs carry `supportSessionId` and fail closed after revoke or expiry.

## Authorities

Active store-role assignments are loaded for the staff member. Each role contributes:

- `ROLE_<ROLE_NAME>`;
- each comma-separated permission stored on the role.

Frontend `hasAccess` performs a flat string match. Backend method checks use Spring `@PreAuthorize`.

## Enforcement layers

| Layer | What it does | What it does not guarantee |
| --- | --- | --- |
| Navigation | Hides unavailable links | API protection |
| Frontend routes | Registers screens for selected authorities | Ownership of requested records |
| JWT filter | Authenticates the request | Permission for every operation |
| `@PreAuthorize` | Protects annotated class/method | Unannotated authenticated endpoints |
| `SecurityUtils` | Replaces request tenant/store with JWT scope; `requireSelfOrAnyAuthority` and `constrainStaffIds` for staff-scoped reads/writes | Every unannotated identifier |

## Multi-tenant model

JWT claims and most records carry tenant/store context. `SecurityUtils` prefers positive tenant/store values from the authenticated principal over request parameters for endpoints that use it. Other endpoints still accept tenant, store, staff, manager, or approver identifiers from requests.

There is no database row-level security. Every service/repository path must enforce ownership.

## Current security risks

- Leave approve/reject and cancellation decisions require `MANAGE_LEAVES`. Employees can apply only for their own `staffId` unless they have `MANAGE_LEAVES`. Holiday writes require `MANAGE_LEAVES`. HR metrics require `VIEW_HR_DASHBOARD`. Flagging regularization requests requires `MANAGE_ATTENDANCE`. Staff-scoped leave, payslip, salary-component, attendance history, and regularization writes require self or the matching `MANAGE_*` authority. `GET /personnel/all` returns the caller only unless `MANAGE_STAFF` or `VIEW_OTHER_STAFF`. Role list GET requires `MANAGE_ROLES` or `MANAGE_STAFF`. Password updates require `MANAGE_STAFF`. Denied `@PreAuthorize` checks return HTTP 403.
- Attendance retrieve and monthly-summary triggers require `MANAGE_ATTENDANCE`. Salary calculate requires `MANAGE_SALARY`. External staff sync requires `MANAGE_STAFF`. Store-hours writes require `MANAGE_SHIFTS` or `MANAGE_STORE_SETTINGS`. Activity log reads require `VIEW_ACTIVITY_LOG` and are tenant/store scoped. The table is append-only (no update/delete API; MySQL triggers reject mutation).
- Previously committed secrets and JWT values must still be rotated wherever they were deployed.
- New externally synced users cannot log in until password reset or an admin password set.
- Browser session data is stored in `localStorage`.
- CORS allowed origins are injected (`CORS_ALLOWED_ORIGINS`); tracked defaults are local Vite origins only.

Detailed items are tracked in [known limitations](../operations/known-limitations.md).

## Required production posture

1. Store secrets in an approved secret manager or injected environment variables.
2. Rotate all values that have appeared in source or historical documents.
3. Enforce tenant/store/staff ownership in backend services.
4. Add explicit authorities to every write or sensitive read endpoint.
5. Keep actuator limited to `/actuator/health` on public paths; put any extra operational endpoints behind authentication or a private network.
6. Use secure cookies or a reviewed browser-token strategy where appropriate.
7. Add cross-tenant and broken-object-authorization tests.

Documentation must never contain real credentials, signing keys, vendor URLs with secrets, personal data, or production database examples.
