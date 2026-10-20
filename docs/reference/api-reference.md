# API reference

> **Audience:** Frontend, backend, integration, QA, support  
> **Purpose:** Inventory the current controller surface  
> **Last verified:** 2026-10-19  
> **Source of truth:** Backend controller annotations and frontend callers

## Conventions

- Primary prefix: `/payroll-management/v1`
- Sync prefix: `/api/v1/sync`
- Authentication: `Authorization: Bearer <token>` except login and forgot-password
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
| GET | `/personnel/all` | JWT |
| POST | `/personnelForAttendanceManagement` | JWT |
| POST | `/personnelAttendanceSummary` | JWT |
| POST | `/personnelDetailsForListOfStaffIds` | JWT |
| POST | `/updatePasswordForPersonnel` | JWT |
| GET | `/roles/permissions/modules` | Authenticated |
| GET | `/roles` | `MANAGE_ROLES` |
| POST | `/roles/create` | `MANAGE_ROLES` |
| POST | `/roles/update?roleId=` | `MANAGE_ROLES` |
| POST | `/roles/assign` | `MANAGE_ROLES` |
| GET | `/roles/staff/{staffId}` | Authenticated |
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

Newer regularization surface:

| Method | Path |
| --- | --- |
| GET | `/regularizations/pending` |
| POST | `/regularizations/apply` |
| POST | `/regularizations/{requestId}/approve` |
| POST | `/regularizations/{requestId}/reject` |

These contracts overlap but are not interchangeable.

## Shifts, roster, reporting, and appointments

All `SStaffShiftsController` paths have class-level `MANAGE_SHIFTS`.

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
| GET | `/leaves/types/{staffId}` | JWT |
| GET | `/leaves/applications/staff/{staffId}` | JWT |
| GET | `/leaves/applications/pending` | JWT |
| POST | `/leaves/apply` | JWT |
| GET | `/leaves/balances/{staffId}` | JWT |
| GET | `/leaves/balances/all/{staffId}` | JWT |
| POST | `/leaves/{applicationId}/approve` | `MANAGE_LEAVES` |
| POST | `/leaves/{applicationId}/reject` | JWT |
| POST | `/leaves/{applicationId}/cancel` | JWT |
| POST | `/leaves/{applicationId}/approve-cancellation` | `MANAGE_LEAVES` |
| POST | `/leaves/{applicationId}/reject-cancellation` | JWT |

All `/admin/leave-plans/*` endpoints require `MANAGE_LEAVES`: leave-type GET/POST/PUT; plan GET/POST/update; assign staff; map/list/update/delete rules; list enrollments; create overrides; adjust balance.

## Salary and payslips

| Method | Path | Extra authorization where present |
| --- | --- | --- |
| POST | `/personnelSalaryComponentsCalculation` | `MANAGE_SALARY` |
| GET | `/personnelSalaryCalculation` | `MANAGE_SALARY` |
| POST | `/monthlyCalculationComponents` | `MANAGE_SALARY` |
| GET | `/getPayslipData` | JWT |
| GET | `/salaryComponentDefinitions` | JWT |
| POST | `/printStaffPayslip` | JWT |
| GET | `/personnelSalaryComponents` | JWT |
| GET | `/personnelSalaryComponentsForMonth` | JWT |
| POST | `/downloadBillPdf` | JWT |
| GET | `/excelOfPayslip` | `MANAGE_SALARY` |

## Operations and dashboard

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/dashboard/metrics` | HR metrics |
| POST | `/trigger/retrieveAttendanceData` | On-demand vendor retrieval |
| POST | `/trigger/calculateMonthWiseSummary` | Build monthly summary |
| POST | `/trigger/calculateSalary` | Run salary calculation |

Trigger endpoints are currently JWT-only and should be restricted before production use.

## Error behavior

Global validation and common failures use an exception response with timestamp, status, error, and message. Some controllers catch errors locally and return `{error: message}` or a legacy response body. A future version should publish OpenAPI and standardize envelopes.
