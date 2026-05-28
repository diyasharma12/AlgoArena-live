# AlgoArena Live Interview + Engineering Guide

This documentation is a project-specific, code-referenced preparation guide for discussing `AlgoArena Live` in SWE interviews.

## How to use this guide

1. Start with architecture and system flow.
2. Read deep dives for critical components.
3. Practice Q&A using the long + short answer versions.
4. Review challenge points to prepare for tough follow-up questions.

## Documentation map

- [01 - Architecture and End-to-End Flow](./01-architecture-and-flow.md)
- [02 - Modules and Important Files](./02-modules-and-files.md)
- [03 - Core Design Decisions and Tradeoffs](./03-design-decisions-and-tradeoffs.md)
- [04 - Deep Dive Components](./04-deep-dive-components.md)
- [05 - Security, Reliability, and Failure Modes](./05-security-reliability-failures.md)
- [06 - Scalability, Performance, and Production Readiness](./06-scalability-performance-production.md)
- [07 - Interview Q&A Bank (with 3 answer styles)](./07-interview-qa.md)
- [08 - Interviewer Challenges, Criticisms, and Improvement Plan](./08-challenges-limitations-roadmap.md)

## Project snapshot

- Monorepo: TurboRepo + pnpm (`turbo.json`, root `package.json`)
- Apps:
  - `apps/web` (Next.js frontend)
  - `apps/server` (Express API + Socket.io)
  - `apps/worker` (BullMQ code execution worker)
- Shared packages:
  - `packages/db` (Prisma schema/client)
  - `packages/queue` (Redis + BullMQ setup)
  - `packages/types` (shared TS types)
  - `packages/ui` (shared UI components)
- Infra: PostgreSQL + Redis via `docker-compose.yml`

## Important note for interviews

This guide intentionally points out both strengths and weaknesses in the current implementation, so you can answer:

- "What worked well?"
- "What would you improve for production?"
- "Why did you pick this approach instead of alternatives?"

