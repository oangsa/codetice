# Next.js Turbopack Native Externals Under Bun

- With Next.js 16.2.9 and Bun 1.3.14, running the Next.js development server under Bun can fail when a Server Component imports a native external package such as `argon2`.
- The generated Turbopack chunk may reference a hashed package name such as `argon2-<hash>` and Bun then reports `Failed to load external module` even though importing `argon2` directly with Bun succeeds.
- Clearing `.next` and reinstalling the package do not correct this runtime-resolution mismatch.
- For local development, run the Next.js CLI under Node.js 20.9 or newer and keep migrations and the grading worker on Bun.
- The web and worker can be launched separately:

  ```powershell
  node node_modules/next/dist/bin/next dev --hostname 0.0.0.0
  bun run worker:jobs
  ```

- Keep Docker Desktop running for the worker. This split-runtime workaround does not change the application's database or grading architecture.
