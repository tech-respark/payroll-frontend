# Activity log

> **Audience:** HR, managers, payroll, support, developers  
> **Purpose:** Explain the store-wide activity history screen and the shared recorder  
> **Last verified:** 2026-10-21  
> **Source of truth:** `ActivityLogDashboard`, `ActivityLogController`, `ActivityRecorder`

## Route

`/activity` requires `VIEW_ACTIVITY_LOG`. The link sits at the bottom of the sidebar (after Profile for staff-only users; after Reports for managers), last in ⌘K Overview, and last in the account drawer. Operations Home also shows a five-event preview. This permission does not by itself open operations Home.

## What users see

A filtered, newest-first list of business events for the signed-in tenant and store. The filter bar is sticky under the header. Module, action, dates, search, page, and size live in the page URL and as query parameters on `GET /activity`; the UI never slices a full list in the browser. Default page size is 20 (10 or 50 from the footer). The response includes `items`, `total`, `page`, `size`, and `totalPages`. Each row is a human summary plus actor, module, and optional context. Expanding a row shows action, username, resource, IP, and redacted context. Failed sign-ins are labelled Failed. Search matches summary, display name, username, and related record. Salary amounts, passwords, OTPs, bank details, and geolocation are stripped before storage.

The log is append-only. There is no edit or delete path in the API. Events exist only from the time the table was introduced; history is not reconstructed from older tables.

## APIs

| Method | Path | Authorization |
| --- | --- | --- |
| GET | `/activity?module=&action=&q=&from=&to=&page=0&size=20` | `VIEW_ACTIVITY_LOG` |
| GET | `/activity/catalog` | `VIEW_ACTIVITY_LOG` |

Tenant and store come from JWT (`SecurityUtils`). Optional `X-TenantID` / `X-StoreID` headers are overridden the same way as Home.

## Data

Rows live in MySQL `activity_log`. The canonical write API is `ActivityRecorder.record(ActivityEvent)` in package `com.relfor.pcs.payroll.activity`. Domain services join the current transaction; sign-in uses `recordSafely` so a log failure cannot block authentication.

Developers adding a feature should:

1. Add a namespaced constant to `ActivityActions` and a catalog label.
2. Inject `ActivityRecorder` and call `record(...)` after the mutation succeeds.
3. Optionally use `@RecordActivity` on simple methods.

Do not log every HTTP GET. Do not store secrets in `context`. See backend `docs/activity-log.md`.

## Permission seeding

`VIEW_ACTIVITY_LOG` is part of the Security & Roles module. Startup grants it to existing roles that already have `MANAGE_ROLES` or `VIEW_HR_DASHBOARD`. Other roles must receive it explicitly on Roles & Permissions.
