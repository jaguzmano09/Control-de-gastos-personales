# Administrative Access

## Authorization model

- New accounts receive the `user` role from the `user_profiles.role` database default.
- Authenticated clients can read their own profile. There is no client policy or application action that allows a user to change a role.
- The `/admin` page checks the signed-in user and their server-read profile role before rendering. Non-admin users receive the not-found response.
- `admin_product_event_metrics` checks `auth.uid()` against `user_profiles` inside the database function. It returns aggregate product-event counts only. It does not query financial tables, and `product_events` has no direct client read policy.
- Hiding the admin navigation item is presentation only; the page and RPC checks are the authorization controls.

## Initial owner provisioning

Provision the owner through an authenticated Supabase SQL Editor session operated by a trusted project owner. Confirm the target UUID against the intended, already-authenticated account in Supabase Auth. Do not select an account by email domain, user metadata, or an unverified email value. Do not promote a user through browser JavaScript, signup metadata, a public API, or an application setting.

Replace the placeholder with the confirmed Auth user UUID. Run this as a single reviewed statement and confirm it returns exactly one row with `role = 'admin'`:

```sql
update public.user_profiles
set role = 'admin', updated_at = now()
where user_id = '<verified-auth-user-uuid>'::uuid
  and role = 'user'
returning user_id, role;
```

If no row is returned, stop and verify the Auth user and profile exist; do not broaden the predicate. If more than one row is returned, stop and investigate the schema. Keep the SQL Editor session and its credentials private. Record the operator, date, verified account UUID, and reason in the restricted operational record without copying access tokens or financial data.

Initial owner provisioning is complete for the sole verified Auth user, using the trusted privileged database process. The account UUID is intentionally not stored in this repository.

## Revocation

Revoke access through the same trusted database-owner process:

```sql
update public.user_profiles
set role = 'user', updated_at = now()
where user_id = '<verified-auth-user-uuid>'::uuid
  and role = 'admin'
returning user_id, role;
```

Confirm exactly one row is returned. Re-check the affected account's `/admin` access after revocation. The RPC independently checks the current database role, so stale navigation state does not preserve metric access.

## Verification and limits

Review the page and RPC checks in source before each public release. In a separate non-production Supabase project, verify normal users cannot render `/admin` or execute the aggregate RPC, while the explicitly provisioned admin can access aggregates. Do not perform role changes or user-isolation experiments against production. This repository does not yet contain an automated admin-role isolation test or an approved non-production Supabase project.
