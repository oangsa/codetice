# Workspace Ownership Lifecycle

Workspaces have one required `owner_id`, separate from membership roles and question authorship.

- A workspace owner and a global admin both receive full administration for that workspace; a TA remains staff-only.
- Ownership transfers only to a global admin through `PATCH /api/workspaces/:id/owner`.
- Workspace creation and cloning assign the acting global admin as owner.
- Deleting an owner account transfers its workspaces to the acting global admin before the account is removed. Demoting an owner from the global-admin role is rejected until ownership is transferred.
- The `0007` migration backfills from `created_by`, uses the oldest global admin only for legacy null creators, and aborts rather than leaving an ownerless workspace.
- Workspace deletion is permanent and relies on the existing workspace-owned foreign-key cascades.
