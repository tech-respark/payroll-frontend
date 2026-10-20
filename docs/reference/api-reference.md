# API reference

> **Audience:** Frontend, backend, integration, QA, support  
> **Purpose:** Inventory the current controller surface  
> **Last verified:** 2026-10-20  
> **Source of truth:** Backend controller annotations and frontend callers

## Conventions

- Primary prefix: `/payroll-management/v1`
- Sync prefix: `/api/v1/sync`
- Authentication: `Authorization: Bearer <token>` except login, forgot-password, and `/actuator/health`
- Content type: usually JSON; PDF/Excel endpoints return binary data
- Tenant/store context: query parameters, request body, JWT claims, or endpoint-specific headers

Response formats vary between `LoginResponse`, `{message, code, timestamp, data}`, legacy `ResponseModel`, raw objects/lists/maps, strings, and binary files. Consumers must follow the specific endpoint rather than assume one envelope.

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/login` | Authenticate and return user, scope, authorities, JWT |
| POST | `/forgot-password/generate-otp` | Start password reset |
| POST | `/forgot-password/verify-otp` | Verify OTP and return reset token |
| POST | `/forgot-password/reset-password` | Set new password |

## Staff and access

| Method | Path | Extra authorization |
| --- | --- | --- |
| GET | `/personnel/all` | Self only unless `MANAGE_STAFF` or `VIEW_OTHER_STAFF` |
| POST | `/personnelForAttendanceManagement` | `MANAGE_STAFF` |
| POST | `/personnelAttendanceSummary` | JWT |
| POST | `/personnelDetailsForListOfStaffIds` | Self-constrained unless `MANAGE_STAFF`, `MANAGE_ATTENDANCE`, or `VIEW_OTHER_STAFF` |
| POST | `/updatePasswordForPersonnel` | `MANAGE_STAFF` |
| GET | `/roles/permissions/modules` | Authenticated |
| GET | `/roles` | `MANAGE_ROLES` or `MANAGE_STAFF` |
| POST | `/roles/create` | `MANAGE_ROLES` |
| POST | `/roles/update?roleId=` | `MANAGE_ROLES` |
| POST | `/roles/assign` | `MANAGE_ROLES` or `MANAGE_STAFF` |
| GET | `/roles/staff/{staffId}` | Self, `MANAGE_ROLES`, or `MANAGE_STAFF` |
| POST | `/api/v1/sync/staff?tenantId=` | JWT |

## Store and holidays

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/storeSettings` | Get open/close time |
| POST | `/storeSettings` | Update store settings |
| GET | `/tenantStoreConfig` | Get payroll/store configuration |
| GET | `/holidays` | List store holidays |
| POST | `/holidays` | Create a holiday |
| DELETE | `/holidays/{id}` | Delete a holiday |

## Attendance and regularization

Legacy/current UI surface:

| Method | Path |
| --- | --- |
| POST | `/regularizeAttendance` |
| POST | `/inOutHistoryInformation` |
| POST | `/advancedInOutHistoryInformation` |
| POST | `/regularizationRequests` |
| POST | `/flagRegularizationRequests` |
| GET | `/personnelAttendanceForADay` |

`/inOutHistoryInformation` and `/advancedInOutHistoryInformation` require `staffIds`. A missing list returns HTTP 400 instead of a SQL `IN null` 500. Callers without `MANAGE_ATTENDANCE`, `MANAGE_STAFF`, or `VIEW_OTHER_STAFF` can only query their own `staffId`. Regularization writes are self-or-`MANAGE_ATTENDANCE`.

Newer regularization surface:

| Method | Path |
| --- | --- |
| GET | `/regularizations/pending` |
| POST | `/regularizations/apply` |
| POST | `/regularizations/{requestId}/approve` |
| POST | `/regularizations/{requestId}/reject` |

These contracts overlap but are not interchangeable.

## Shifts, roster, reporting, and appointments

Shift GET/list paths accept `VIEW_SHIFTS` or `MANAGE_SHIFTS`. Roster and slot writes require `MANAGE_SHIFTS`. Report POSTs accept `VIEW_REPORTS`, `MANAGE_ATTENDANCE`, `MANAGE_SALARY`, or `MANAGE_SHIFTS`. Date-scoped `GET /staffshifts` reads `staff_shifts` only (personnel `staff_id` is not a join key). Roster GET and staff reports resolve stored `staff_id` against `personnel_details.id` or `personnel_code` and return canonical `id`.

| Method | Path |
| --- | --- |
| GET/POST | `/staffshifts` |
| GET | `/staffshifts/store/weekly` |
| GET | `/staffshifts/staff` |
| GET/POST | `/shiftslots` |
| GET | `/shiftslots/all` |
| POST | `/staffProductivity` |
| POST | `/staffProductivityForUpdatedOrder` |
| POST | `/utility/stylistProductivity` |
| POST | `/staffBookedshifts/{startday}` |
| GET | `/availableStaffSlots` |
| GET | `/allStaffsSlots` |
| GET | `/staffShifts/stylistRevenue` |
| POST | `/staffs/weeklyOff` |
| POST | `/staff/report` |
| POST | `/staff/report/summary` |
| POST | `/staff/report/detailed` |
| GET | `/availableStaffIds` |
| POST | `/staff/report/query` |
| POST | `/staff/slot` |
| PUT | `/staff/cancelSlot/{appointmentid}` |

Break-time paths: `POST /staffBreakTimes`, `POST /staffBreakTime`, `GET /staffBreakTime`, `GET /staffBreakTimeSlot`, and `GET /getStaffBreakTime`.

## Leave

Employee/manager operations:

| Method | Path | Extra authorization where present |
| --- | --- | --- |
| GET | `/leaves/types/{staffId}` | Self or `MANAGE_LEAVES` |
| GET | `/leaves/applications/staff/{staffId}` | Self or `MANAGE_LEAVES` |
| GET | `/leaves/applications/pending` | JWT |
| POST | `/leaves/apply` | Self unless `MANAGE_LEAVES` |
| GET | `/leaves/balances/{staffId}` | Self or `MANAGE_LEAVES` |
| GET | `/leaves/balances/all/{staffId}` | Self or `MANAGE_LEAVES` |
| POST | `/leaves/{applicationId}/approve` | `MANAGE_LEAVES` |
| POST | `/leaves/{applicationId}/reject` | `MANAGE_LEAVES` |
| POST | `/leaves/{applicationId}/cancel` | JWT actor |
| POST | `/leaves/{applicationId}/approve-cancellation` | `MANAGE_LEAVES` |
| POST | `/leaves/{applicationId}/reject-cancellation` | `MANAGE_LEAVES` |

All `/admin/leave-plans/*` endpoints require `MANAGE_LEAVES`: leave-type GET/POST/PUT; plan GET/POST/update; assign staff; map/list/update/delete rules; list enrollments; create overrides; adjust balance.

## Salary and payslips

| Method | Path | Extra authorization where present |
| --- | --- | --- |
| POST | `/personnelSalaryComponentsCalculation` | `MANAGE_SALARY` |
| GET | `/personnelSalaryCalculation` | `MANAGE_SALARY` |
| POST | `/monthlyCalculationComponents` | `MANAGE_SALARY`; month-scoped variables |
| GET | `/getPayslipData` | Self or `MANAGE_SALARY` |
| GET | `/salaryComponentDefinitions` | JWT |
| POST | `/printStaffPayslip` | Self or `MANAGE_SALARY` |
| GET | `/personnelSalaryComponents` | Self or `MANAGE_SALARY` |
| GET | `/personnelSalaryComponentsForMonth` | Self or `MANAGE_SALARY` |
| POST | `/downloadBillPdf` | Self or `MANAGE_SALARY` |
| GET | `/excelOfPayslip` | `MANAGE_SALARY` |

## Hospitality payroll

Prefix: `/hospitality`. Tenant and store come from query parameters and are overwritten from the JWT.

| Method | Path | Extra authorization |
| --- | --- | --- |
| GET / POST | `/advances`, `/advances/{id}/close` | View: `MANAGE_SALARY`, `VIEW_HOSPITALITY`, or `MANAGE_HOSPITALITY`. Write: `MANAGE_SALARY` or `MANAGE_HOSPITALITY` |
| GET / POST / DELETE | `/commission-plans` | Same as advances |
| GET / POST | `/sales`, `/sales/import` | Same as advances |
| GET / POST | `/tip-pools`, `/tip-pools/{id}/distribute` | Same as advances |
| GET / PUT | `/statutory` | Same as advances |
| GET / POST | `/daily-sales` | GET also allows `VIEW_REPORTS` |
| GET | `/labor` | Reports, manage-salary, or hospitality |
| GET | `/muster` | Reports, manage-salary, attendance, or hospitality |
| GET | `/neft` | CSV; `MANAGE_SALARY` or `MANAGE_HOSPITALITY` |
| POST | `/apply-payroll` | `MANAGE_SALARY` or `MANAGE_HOSPITALITY` |
| GET / POST | `/fnf`, `/fnf/{id}/settle` | View also allows `MANAGE_STAFF` |
| GET / POST | `/swaps`, `/swaps/{id}/decide` | Create is authenticated. Decide needs `MANAGE_SHIFTS` or `MANAGE_HOSPITALITY` |
| GET / POST | `/availability` | Self or shift/hospitality managers |
| POST | `/clock` | Authenticated self |
| GET | `/me` | Authenticated self |

## Operations and dashboard

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/home/staff` | Aggregated staff home for the JWT staff id. Authenticated. Pay month is omitted when the store has no calculated month. |
| GET | `/home/operations?includeSnapshot=` | Aggregated operations home. Requires an operations permission (`VIEW_OTHER_STAFF`, `MANAGE_*`, `VIEW_REPORTS`, `VIEW_HR_DASHBOARD`, or hospitality). `VIEW_ACTIVITY_LOG` is not sufficient. Snapshot only with `VIEW_HR_DASHBOARD`. |
| GET | `/activity?module=&action=&q=&from=&to=&page=&size=` | Store activity page (server-paged); `VIEW_ACTIVITY_LOG` |
| GET | `/activity/catalog` | Module and action filter catalog; `VIEW_ACTIVITY_LOG` |
| GET | `/admin/dashboard/metrics` | HR snapshot; `VIEW_HR_DASHBOARD` |
| POST | `/trigger/retrieveAttendanceData` | On-demand vendor retrieval; `MANAGE_ATTENDANCE` |
| POST | `/trigger/calculateMonthWiseSummary` | Build monthly summary; `MANAGE_ATTENDANCE` |
| POST | `/trigger/calculateSalary` | Run salary calculation; `MANAGE_SALARY` |
| POST | `/api/v1/sync/staff` | External staff import; `MANAGE_STAFF` |

## Error behavior

Global validation and common failures use an exception response with timestamp, status, error, and message. Some controllers catch errors locally and return `{error: message}` or a legacy response body. A future version should publish OpenAPI and standardize envelopes.
