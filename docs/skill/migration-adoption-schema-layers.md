# Migration Adoption Schema Layers

Database baseline adoption may mark migrations as applied only after every earlier schema layer has been verified. A later feature table or column is not evidence that its prerequisites are intact.

- Validate the complete `sandbox_jobs` table—required columns, types, constraints, and indexes—before adopting tag-era or owner-era workspace schemas.
- Compose later completeness checks with the sandbox completeness result rather than allowing a current workspace owner to bypass it.
- If a migration-history-free database has a partial schema, abort with the ambiguous-adoption error instead of recording migrations that would hide the inconsistency.
