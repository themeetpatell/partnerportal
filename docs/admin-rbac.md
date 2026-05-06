# Admin app RBAC

Access control in the admin application is **two independent layers**. Both must allow an action for it to succeed in production.

## 1. Module permissions (navigation and feature gates)

**Source of truth:** `apps/admin/src/lib/rbac.ts`

- **Roles** (canonical values stored on `team_members.role`): `super_admin`, `admin`, `partnership_manager`, `sdr`, `finance`, `viewer`. Aliases such as `partnership`, `sales`, or `appointment_setter` are normalized to these.
- **Modules:** `partners`, `leads`, `services`, `invoices`, `commissions`, `users`, `analytics`.
- **Levels:** `""` (no access), `r` (read), `rw` (read + write).

Defaults are defined in `ROLE_DEFAULT_PERMISSIONS`. Per-user overrides may come from JSON stored on the team member (`permissions`); `getResolvedPermissions` merges **viewer defaults → role defaults → overrides**. UI and server checks use `hasModuleAccess(role, permissions, module, requiredLevel)`.

### Default matrix (no per-user overrides)

| Role | Partners | Leads | Services | Invoices | Commissions | Users | Analytics |
|------|----------|-------|----------|----------|-------------|-------|-----------|
| **Super Admin** | rw | rw | rw | rw | rw | rw | rw |
| **Admin** | rw | rw | rw | rw | rw | rw | r |
| **Partnership Manager** | rw | rw | rw | r | r | — | r |
| **SDR Team** (`sdr`) | r | rw | rw | — | — | — | r |
| **Finance** | r | r | r | rw | rw | — | r |
| **Viewer** | r | r | r | r | r | — | r |

- **Users** (`/settings/users`) is restricted to **`super_admin` and `admin`** via `USER_MANAGEMENT_ROLES` (not expressed as a separate column in the table above: other roles effectively have no users module).

Super Admin and Admin **ignore Row Scope** for data visibility (see below). Configure Row Scope on their profile for consistency in the UI only; enforcement treats them as **tenant-wide**.

## 2. Row scope (which partner-linked rows appear)

**Source of truth:** `apps/admin/src/lib/row-scope.ts`

Stored on **`team_members.row_scope`** (UI labels: **All records**, **Team records**, **Own records only**). Values normalized in code: `all` | `team` | `own`.

### Who bypasses row scope

- Roles **`super_admin`** and **`admin`**: always **unrestricted** within the tenant (`bypassesRowScope`).
- **`row_scope = all`** (for any other role): **unrestricted** within the tenant.

### Restricted modes (`team` or `own`)

For non-bypass roles with `team` or `own`, visibility is reduced to partner IDs computed by `resolvePartnerRowScope`:

1. **Partner ownership:** partners where `partners.owner_id = current team_members.id`.
2. **Attribution:** partners that appear on **leads** or **service requests** where `assigned_to` or `created_by` matches one or more Supabase auth user IDs in scope:
   - **`own`** → only the signed-in user’s `auth_user_id`.
   - **`team`** → all **active** team members on the **same tenant** with the **same stored `role` string** as the current member (fallback: at least the current user if none match).

All listing, detail, analytics, and create flows that touch partners, leads, service requests, invoices, or commissions apply this scope in SQL (`partnerScopeWhere`, `scopedPartnerFilters`, `isPartnerReadable`). APIs return **403** or empty result sets when creating or reading out-of-scope resources.

### Effective behavior summary

| Row Scope | Who (non–Super Admin / non–Admin) | Partner-linked data |
|-----------|-----------------------------------|---------------------|
| **All records** | Any | Full tenant (subject to module permissions). |
| **Team records** | Same `role` cohort | Owned partners + partners tied to cohort’s lead/SR activity. |
| **Own records only** | Signed-in user | Owned partners + partners tied to that user’s lead/SR activity. |

Invoices and commissions inherit visibility through **`partner_id`** (same partner set as above).

## Implementation map

- **Module access:** sidebar and route guards using `hasModuleAccess`; user management gate with `USER_MANAGEMENT_ROLES`.
- **Row scope:** server components under `apps/admin/src/app/(dashboard)/` and handlers under `apps/admin/src/app/api/admin/` that query `partners`, `leads`, `service_requests`, `invoices`, or `commissions`.

When adding a new admin screen or API, apply **tenant filter** (`tenant_id`), **`deleted_at` / soft-delete** filters where applicable, **module checks** where appropriate, and **partner row scope** for any partner-scoped entity.
