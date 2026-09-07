# Skill: sortable data tables and scoped CSV export

Use the shared `DataTable` sorting contract for every data-bearing table header. The first activation sorts ascending, the second descending, and selecting another column starts ascending. Numeric values compare numerically, text compares case-insensitively, dates compare chronologically, and null or empty values remain last in both directions. Selection, derived row-number, empty, and action-only columns are not sortable.

For API-backed tables, add the active sort to the shared collection-search request and apply its allowlisted SQL expression before page-number pagination with a unique tiebreaker. Preserve the endpoint's established default order when no sort is present. For server-rendered pages, carry the sort through pagination URLs; for fully loaded client tables, provide `sortValue` and use local sorting.

CSV export is a separate opt-in table action, not an automatic feature of every table. The workspace Scoreboard is the only current export surface. It collects every authorized page using the active search and sort, then creates a UTF-8 CSV with a BOM, correct quoting, and spreadsheet-formula protection. Keep the control icon-only with a tooltip and accessible label.
