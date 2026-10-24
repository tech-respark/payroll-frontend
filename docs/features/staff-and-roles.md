# Staff and roles

> **Audience:** HR users, managers, support, developers  
> **Purpose:** Explain staff records and role assignment  
> **Last verified:** 2026-10-24  
> **Source of truth:** `StaffDashboard`, `RoleManagement`, staff/role controllers

## Staff Details (`/staff`)

The authenticated landing page is [`/home`](home.md). Managers with `VIEW_OTHER_STAFF` or `MANAGE_STAFF` still open **Staff** from the sidebar and see a searchable directory and the large profile header. Staff-only users see the same route as **Profile** at the bottom of the sidebar: compact tabs and fields, no directory, no avatar header, no read-only banner. They do not see raw permission codes. The Account drawer has a collapsible **What you can do** list just above Sign out (plain language: attendance, clock/swaps, leave, salary/payslips when `VIEW_SALARY` is present, and profile). Reporting manager uses the shared staff picker. Removing a document or experience asks for confirmation before it leaves the form.

The editor groups data into:

1. Personal & Access
2. Joining & Employment
3. Banking & Documents
4. Work Experience

Employment also stores hospitality pay fields: pay cycle, employment type, job codes, overtime multiplier, ESI number, and PAN.

`MANAGE_STAFF` enables create/edit controls and the full store directory. `VIEW_OTHER_STAFF` also enables the directory without write access. Empty joining `Long` fields are sent as `null` on save. After create, child bank/document rows receive the saved staff id.

### Save flow

```mermaid
sequenceDiagram
    actor HR
    participant UI as StaffDashboard
    participant API as PayrollAPI
    participant DB as MySQL
    HR->>UI: Create or edit staff
    UI->>API: POST personnelForAttendanceManagement
    API->>DB: Save staff and child records
    UI->>API: POST roles/assign
    API->>DB: Save store-role assignment
```

The frontend sends the staff save before role assignment. A valid role/store link in `s_store_staff_role` is required for expected authorities at login.

## Roles & Permissions (`/roles`)

Requires `MANAGE_ROLES` in the UI and backend controller.

The page is a role list. **New role** and row click open a drawer for name, description, and module permissions.

Administrators can:

- create and update tenant roles;
- select permission IDs grouped by access module;
- assign a role to a staff member at a store;
- inspect a staff member's assigned role.

Role permissions are persisted as comma-separated strings. At login the backend emits both `ROLE_<ROLE_NAME>` and each permission string as authorities.

## External staff import

The backend can import roles and staff from a configured external system. Imported roles start with no permissions and need administrative review. New users are created with an implementation default credential; operators must require a secure reset before access.

See [integrations](../architecture/integrations.md).

## Known behavior

- `MANAGE_STAFF` and `VIEW_OTHER_STAFF` both receive the full store directory. Callers without those authorities receive only their own personnel row.
- Staff ID, employee code, and legacy personnel code are distinct identifiers.
- Password updates require `MANAGE_STAFF`. After a role change, `GET /session` (on load and tab visibility) refreshes cached UI authorities; the API already reloads `UserDetails` per request.
- Do not rely only on hidden UI controls for security.
