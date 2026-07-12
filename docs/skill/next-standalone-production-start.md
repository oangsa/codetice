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
