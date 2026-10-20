# Runbook and troubleshooting

> **Audience:** Developers, QA, support, operators  
> **Purpose:** Diagnose common local and application failures  
> **Last verified:** 2026-10-19  
> **Source of truth:** Verified startup behavior and current code paths

## Service health sequence

Check dependencies in this order:

1. MySQL is listening and `payroll_management` is accessible.
2. Backend uses Java 21 and has a readable keystore.
3. Backend logs show Tomcat on HTTPS 8092 and a started connection pool.
4. Frontend listens on 5174.
5. Browser loads `/login`.
6. A login request reaches `/payroll-management/v1/login`.

## Login succeeds but UI is empty

- Confirm the user has an active `s_store_staff_role`.
- Confirm the role is active and has comma-separated permissions.
- Confirm tenant/store IDs in the login response.
- Check whether the requested route is registered for those authorities.
- A protected unknown route currently renders blank content rather than an access-denied page.

## Login fails

- Verify username or email and BCrypt password.
- Confirm staff is active and assigned to an active role/store.
- Check backend database connection.
- Use browser network output and backend logs; do not log passwords or JWTs.

## Frontend cannot reach backend

- Use `http://localhost:5174`, not a different origin.
- Confirm backend HTTPS port 8092.
- Confirm Vite proxy target and backend certificate.
- Test the API path through Vite, because frontend requests are relative.
- Check CORS if calling the backend directly.

## Backend cannot start

| Symptom | Check |
| --- | --- |
| Java version error | Java 21 is selected in `JAVA_HOME` |
| Database connection refused | JDBC host/port and MySQL process |
| Access denied | Local DB account and injected password |
| Keystore failure | JKS exists, password/alias match |
| Port in use | Existing process on 8092 |
| Entity/schema error | Dump/migration matches current entity mappings |

## Attendance missing

- Confirm tenant biometric vendor and credentials.
- Confirm store/employee external mappings.
- Check due `payroll_scheduler_info`.
- Trigger a bounded test date range.
- Inspect raw attendance before daily/monthly summaries.
- Confirm timezone and shift assignment.

## Leave balance unexpected

- Check active enrollment and plan rules.
- Inspect ledger entries rather than only the displayed total.
- Confirm scheduler execution and duplicate accruals.
- Check overrides, approved requests, cancellation, and expiry entries.

## Payroll missing or incorrect

- Confirm monthly attendance summary exists.
- Confirm component definitions and staff values.
- Check formula aliases, order, and rule rows.
- Check store working-days/hours and salary cycle.
- Inspect payslip history uniqueness for the staff/month/year.

## External staff sync imports no data

- Confirm tenant external URL/app name and store branch ID.
- Verify both `getRoles?branchId=` and `getStaffs?branchId=` contracts.
- Ensure email/employee code are valid and unique.
- Review backend error output for the specific tenant/store.

## Incident hygiene

Capture timestamp, environment, tenant/store IDs, correlation evidence, endpoint, safe request shape, response status, and relevant sanitized log lines. Never include credentials, JWTs, OTPs, salary details, bank data, or unredacted database rows in tickets.
