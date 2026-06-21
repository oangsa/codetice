Question and language forms should not expose slug inputs. Derive slugs server-side from the title/name with `slugify`, then append numeric suffixes when needed to keep database slugs unique.
