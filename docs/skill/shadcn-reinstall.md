# Shadcn Component Reinstall

When shadcn UI primitives drift from the registry output, reinstall them with `bunx --bun shadcn@latest add <components> --overwrite --yes`.

Do not reinstall `sonner` when the app has a local toast setup. After reinstalling `badge`, update call sites to use only the built-in variants: `default`, `outline`, `secondary`, and `destructive`.
