# Authentication, authorization, and tenancy

> **Audience:** Developers, architects, security reviewers, operators  
> **Purpose:** Document implemented controls and verified gaps  
> **Last verified:** 2026-10-20  
> **Source of truth:** Security configuration, JWT classes, role loading, frontend auth context

## Authentication

Login accepts username or email plus password. Passwords are matched with BCrypt. Inactive accounts are rejected with the same 401 message as invalid credentials. On success the API issues an HS256 JWT containing username, `tenantId`, and `storeId`. Token lifetime is `jwt.expiration-ms` (default ten hours). The signing secret is `jwt.secret` / `JWT_SECRET` and must be at least 32 bytes; the process fails to start if it is missing or too short.

The frontend stores `jwtToken` and the login response in `localStorage`, sends `Authorization: Bearer <token>`, and clears the session on non-login **401** responses. A **403** stays signed in and surfaces a permission error. Missing, expired, or invalid JWTs are unauthenticated and return **401**. Denied authorities on an authenticated request return **403**. Inactive users cannot keep using an old token; the JWT filter requires `UserDetails.isEnabled()`.

Public backend paths are login, forgot-password routes, CORS preflight, and `/actuator/health`. All other paths, including remaining actuator routes, require an authenticated request.

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
