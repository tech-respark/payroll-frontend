# Authentication, authorization, and tenancy

> **Audience:** Developers, architects, security reviewers, operators  
> **Purpose:** Document implemented controls and verified gaps  
> **Last verified:** 2026-10-19  
> **Source of truth:** Security configuration, JWT classes, role loading, frontend auth context

## Authentication

Login accepts username or email plus password. Passwords are matched with BCrypt. On success the API issues an HS256 JWT containing username, `tenantId`, and `storeId`, with a ten-hour lifetime.

The frontend stores `jwtToken` and the login response in `localStorage`, sends `Authorization: Bearer <token>`, and clears the session on non-login 401/403 responses.

Public backend paths are login, forgot-password routes, CORS preflight, and `/actuator/**`. All other paths require an authenticated request.

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
| `SecurityUtils` | Can replace request tenant/store with JWT scope | Staff/resource ownership everywhere |

## Multi-tenant model

JWT claims and most records carry tenant/store context. `SecurityUtils` prefers positive tenant/store values from the authenticated principal over request parameters for endpoints that use it. Other endpoints still accept tenant, store, staff, manager, or approver identifiers from requests.

There is no database row-level security. Every service/repository path must enforce ownership.

## Current security risks

- The backend repository contains hardcoded/default secrets in configuration and JWT code. Rotate and externalize them.
- Several sensitive endpoints are only authenticated, not permission-gated.
- Some leave reject/cancellation and attendance approval paths lack explicit management authorities.
- Staff/password and payroll trigger endpoints need stronger authorization.
- JWT signing secret is source-controlled.
- Password reset uses weaker token/OTP practices than recommended.
- New externally synced users receive a predictable initial credential.
- Inactive user enforcement requires review.
- Public actuator matching is broader than the intended private operational posture.

Detailed items are tracked in [known limitations](../operations/known-limitations.md).

## Required production posture

1. Store secrets in an approved secret manager or injected environment variables.
2. Rotate all values that have appeared in source or historical documents.
3. Enforce tenant/store/staff ownership in backend services.
4. Add explicit authorities to every write or sensitive read endpoint.
5. Restrict actuator to a private network or authenticated operations role.
6. Use secure cookies or a reviewed browser-token strategy where appropriate.
7. Add cross-tenant and broken-object-authorization tests.

Documentation must never contain real credentials, signing keys, vendor URLs with secrets, personal data, or production database examples.
