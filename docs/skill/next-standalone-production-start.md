# Next standalone production start

When `next.config.ts` uses `output: "standalone"`, production startup should
run the generated standalone server rather than `next start`:

```json
{
  "scripts": {
    "start": "bun .next/standalone/server.js"
  }
}
```

This matches the Docker runner and avoids Next.js warning that `next start`
does not support standalone output. The build runs `prepare-standalone.ts` to
copy `public/` and `.next/static` next to `server.js`, because Next does not
include them in standalone output by default. Run `bun run build` before
starting so all of those files exist.

If the root layout uses a remote `next/font` provider, the production compile
needs outbound access to fetch that font unless it has already been vendored.
A build that appears to stall at optimization in a restricted sandbox should
be rerun with the font host available before changing bundlers or build flags.
