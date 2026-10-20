# Integrations and scheduled processing

> **Audience:** Integration developers, architects, operators, client implementation teams  
> **Purpose:** Define current integration directions, prerequisites, and schedules  
> **Last verified:** 2026-10-19  
> **Source of truth:** Integration services, handlers, schedulers, and configuration

## Team Office biometric attendance

The backend is the HTTP client. Per-tenant database configuration supplies vendor URL and credentials. `AttendanceRetrievalRoutingService` selects a handler using the uppercase biometric vendor name; the implemented bean is `TEAM_OFFICE`.

The handler requests punches for employee/date ranges and writes raw attendance for later summary processing. Credentials must be supplied through a protected operational process, not documentation or tickets.

## External role and staff import

Import is triggered by authenticated:

```text
POST /api/v1/sync/staff?tenantId={optionalTenantId}
```

For each configured tenant/store, the backend calls:

```text
GET {baseUrl}/{appName}/getRoles?branchId={branchId}
GET {baseUrl}/{appName}/getStaffs?branchId={branchId}
```

Roles response:

```json
{
  "roles": [
    { "roleName": "Store Manager", "description": "Manages a store" }
  ]
}
```

Staff response:

```json
{
  "staff": [
    {
      "externalStaffId": "EMP-1001",
      "firstName": "Sample",
      "lastName": "User",
      "email": "sample.user@example.invalid",
      "phone": "+10000000000",
      "gender": "Female",
      "isActive": true,
      "roleName": "Store Manager"
    }
  ]
}
```

`externalStaffId` maps to `employee_code`; email becomes username. Stores without `external_branch_id` are skipped. New roles have empty permissions and require review.

This sync is on demand; no periodic staff-sync scheduler is implemented.

## RabbitMQ and notifications

`WhatsappNotificationService` publishes message payloads through RabbitMQ using environment-prefixed exchange/routing values. Password-reset OTP depends on this path. The broker is an operational dependency only when these notifications are required.

## SMTP

`EmailService` sends asynchronous leave and regularization notifications through Spring Mail. Configure SMTP credentials outside source control.

## Scheduled jobs

| Job | Default schedule | Purpose |
| --- | --- | --- |
| Attendance reminder | Fixed delay, 1,200,000 ms | Pull due biometric rows, then advance them one day only after success |
| Monthly leave accrual | Midnight, first of month | Apply monthly rules |
| Quarterly leave accrual | Midnight, first of Jan/Apr/Jul/Oct | Apply quarterly rules |
| Annual expiry/grant | 00:01, first of January | Expire carry-forward and apply annual rules |

Schedulers run inside the API JVM. In a multi-instance deployment, use leader election or a distributed lock to avoid duplicate execution.

## Integration readiness checklist

- Stable tenant, store, and external branch mapping
- Test endpoint and TLS/network access
- Non-production credentials stored securely
- Idempotency and retry scenarios tested
- Unknown roles and inactive staff behavior agreed
- Employee-code uniqueness checked
- Monitoring and failure ownership assigned
- Initial passwords reset before user access
