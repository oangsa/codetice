# Legacy assignment retirement

When a data model is needed only to derive ownership during a migration, retire it in a later checked-in migration instead of deleting it from the ownership migration itself. This keeps the data transformation deterministic for old production snapshots while ensuring the live schema contains only the new domain.

Drop dependent foreign keys and columns before dropping the legacy tables, and avoid `CASCADE` so an unexpected dependency fails loudly. Migration adoption must recognize both the pre-retirement workspace schema and the final schema: adopt the former only through the preceding migration, then execute the retirement migration; adopt the latter through the current migration.
