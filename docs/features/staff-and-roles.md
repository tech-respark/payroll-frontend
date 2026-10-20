# Staff and roles

> **Audience:** HR users, managers, support, developers  
> **Purpose:** Explain staff records and role assignment  
> **Last verified:** 2026-10-19  
> **Source of truth:** `StaffDashboard`, `RoleManagement`, staff/role controllers

## Staff Details (`/staff`)

The authenticated landing page is the Staff Details screen. Users without broader staff access are automatically scoped toward their own record.

The editor groups data into:

1. Personal & Access
2. Joining & Employment
3. Banking & Documents
4. Work Experience

`MANAGE_STAFF` enables create/edit controls. `VIEW_OTHER_STAFF` enables broader directory and staff-selection behavior in several screens.

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

- `MANAGE_STAFF` can display directory controls while the common staff query still limits results unless `VIEW_OTHER_STAFF` is present.
- Staff ID, employee code, and legacy personnel code are distinct identifiers.
- The backend has authenticated staff write and password-update endpoints without complete method-level permission enforcement. Do not rely only on hidden UI controls.
