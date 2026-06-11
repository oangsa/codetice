# Clickable Submission Rows

Submission history tables should make the row content clickable instead of reserving a separate `View` action column.

Use `next/link` inside each `TableCell` rather than wrapping `TableRow`, because anchors cannot validly wrap table rows. Apply negative margin plus matching padding to the links so each cell keeps the table spacing while exposing a large click target.
