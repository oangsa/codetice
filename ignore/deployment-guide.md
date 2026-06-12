# Deployment Guide

## What this project needs in production

This project is not just a plain Next.js website. It has four moving parts:

1. A web app (`next start`)
2. A PostgreSQL database
3. A grading worker process
4. Docker on the grading host, because code execution runs through `docker run`

## Current deployment model

### Web app

- Build with `bun run build`
- Serve with `bun run start`

### Database

- PostgreSQL
- Run schema bootstrap with `bun run db:push`
- Seed the initial admin and language rows with `bun run db:seed`

### Worker

- Worker command: `bun run worker:jobs`
- Current worker script is one-shot, not a daemon
- In production it must be run repeatedly by:
  - `systemd`
  - a process manager
  - cron/timer
  - or a shell loop

Example loop:

```bash
while true; do
  bun run worker:jobs
  sleep 2
done
```

### Grading runtime

- `GRADING_RUNTIME=docker`
- Docker must be installed and accessible from the app/worker host
- If Docker is unavailable, grading fails closed by design

## Required environment variables

At minimum:

```env
DATABASE_URL=postgres://...
SESSION_SECRET=...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=...
NODE_ENV=production
GRADING_RUNTIME=docker
```

## Recommended production architecture

## Small production / MVP

Use one VPS plus PostgreSQL:

- 1 host for:
  - Next.js web app
  - grading worker
  - Docker daemon
- 1 PostgreSQL instance

This is the simplest workable deployment.

## Better split

Use:

- 1 small web host
- 1 separate grading host with Docker
- 1 managed PostgreSQL instance

This is safer because untrusted code execution is separated from the public web process.

## Important throughput caveat

The current implementation processes grading jobs through a polling worker script and the grading service handles testcase runs sequentially per submission.

Also, the current queue claiming logic is not designed for safely scaling to many parallel worker processes yet.

That means:

- one worker process is the safe assumption today
- the real bottleneck is grading architecture, not the Next.js frontend
- if you need stable higher throughput, the next engineering step is queue locking / lease-based job claiming and multiple workers

## Minimum spec suggestion for about 30 submissions per minute

This recommendation is an engineering estimate based on the current code path, not a hard benchmark.

### Assumptions

- about 30 submissions per minute means roughly 1 submission every 2 seconds
- each submission may run several testcases
- each testcase starts a Docker container
- grading is currently sequential per submission
- web traffic is modest compared with grading load

### Minimum practical spec I would start with

## Option A: single-host deployment

- 8 vCPU
- 16 GB RAM
- 150+ GB SSD
- Docker installed
- PostgreSQL either managed or local

Why:

- 2 vCPU / 4 GB is enough for the web app alone
- the grader is what needs CPU and memory headroom
- Docker container startup overhead and repeated testcase execution are the expensive part

### Recommendation for this option

- keep PostgreSQL managed if possible
- run one web process
- run one worker loop
- put Nginx or Caddy in front

## Option B: split web and grader

### Web host

- 2 vCPU
- 4 GB RAM
- 40+ GB SSD

### Grader host

- 8 vCPU
- 16 GB RAM
- 100+ GB SSD
- Docker installed

### Database

- managed PostgreSQL
- at least 2 vCPU / 4 GB equivalent

This is the minimum setup I would prefer if you expect regular grading traffic.

## If you truly need sustained 30/min reliably

With the current codebase, I would not promise sustained 30 submissions per minute under mixed real workloads without refactoring the worker model.

To reach that target with confidence, do this next:

1. Add job leasing / locking so multiple workers can process jobs safely
2. Run multiple worker processes
3. Move grader execution to a dedicated host or service
4. Add queue metrics and job latency monitoring

After that, a better target would be:

- web: 2 vCPU / 4 GB
- grader: 12 to 16 vCPU / 24 to 32 GB
- managed PostgreSQL

## What not to do

- Do not deploy this as a pure serverless Next.js app
- Do not rely on Vercel-only hosting for grading in the current architecture
- Do not run untrusted grading code without Docker
- Do not assume multiple worker replicas are safe today without queue-claiming changes

## Suggested deployment steps

1. Provision PostgreSQL
2. Provision Linux host with Docker and Bun
3. Set environment variables
4. Run:

```bash
bun install
bun run build
bun run db:push
bun run db:seed
```

5. Start web app:

```bash
bun run start
```

6. Start worker loop:

```bash
while true; do
  bun run worker:jobs
  sleep 2
done
```

7. Put Nginx or Caddy in front of the web app

## Summary

If you just want the minimum working production deployment:

- one 8 vCPU / 16 GB Linux VPS
- Docker installed
- managed PostgreSQL
- one Next.js web process
- one worker loop

If you want safer real traffic handling:

- split web and grader hosts
- then refactor the worker model before scaling concurrency
