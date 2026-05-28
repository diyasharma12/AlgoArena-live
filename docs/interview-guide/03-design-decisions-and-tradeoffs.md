# 03 - Core Design Decisions and Tradeoffs

This chapter explains why major choices were made, what alternatives existed, and what tradeoffs were accepted.

## 1) Monorepo with TurboRepo + pnpm

## Choice

Use one repository for all apps and packages with shared dependencies and build graph orchestration.

## Why this was chosen

- Shared code (`@repo/db`, `@repo/queue`, `@repo/types`) reduces duplication.
- Single install/dev workflow (`pnpm dev` runs all app dev servers via Turbo).
- Consistent TypeScript and lint configs from workspace packages.

## Tradeoffs

- More initial setup complexity than separate repos.
- Task and dependency graph debugging can be harder for newcomers.

## Alternative

Separate repos per app + published internal packages. Better isolation, but slower iteration and heavier release management.

## 2) Split into web, server, and worker apps

## Choice

Keep UI, API/realtime, and code execution in distinct runtimes.

## Why this was chosen

- API must stay responsive while heavy code runs elsewhere.
- Realtime sockets need long-lived server process behavior.
- Worker scaling can be decoupled from web/API scaling.

## Tradeoffs

- More deployment units.
- Cross-service observability and debugging effort increases.

## Alternative

Single full-stack app (e.g. Next.js only). Simpler setup, but weaker separation of concerns and poor fit for long-running code execution workloads.

## 3) Redis for active match state, Postgres for durable history

## Choice

- Redis stores hot and transient state (`waiting_users`, `active_match:*`, submissions hash, expiration zset).
- Postgres stores completed business records (matches, submissions, ratings, social, messages).

## Why this was chosen

- Match state is write-heavy and latency-sensitive.
- Redis TTL and list/hash/zset structures align well with queueing and timers.
- Postgres remains source of truth for long-term records.

## Tradeoffs

- Dual-write architecture complexity.
- Potential temporary inconsistency if finish transaction fails and retry logic is exhausted.

## Alternative

All state in Postgres with polling and row locks. Simpler consistency model, but poor latency and operational cost for real-time loops.

## 4) Socket.io for realtime communication

## Choice

Use Socket.io for match and social realtime events.

## Why this was chosen

- Built-in reconnection support.
- Room semantics for user and match targeting.
- Easy integration with existing Node/Express app.

## Tradeoffs

- Extra server state management around socket-user maps.
- Horizontal scaling requires adapter setup (e.g. Redis adapter).

## Alternative

Raw WebSocket for minimal abstraction, or SSE for one-way updates only.

## 5) BullMQ worker queue for submission processing

## Choice

Submissions are enqueued and consumed asynchronously by worker.

## Why this was chosen

- Decouples API latency from execution time.
- Retries and worker controls available in queue primitive.
- Operationally compatible with Redis already used by project.

## Tradeoffs

- Eventual result delivery, not immediate HTTP response.
- Queue visibility and dead-letter handling need explicit tooling.

## Alternative

Direct synchronous execution in API process (rejected due to blocking and security concerns).

## 6) Docker-based sandbox execution

## Choice

Run user code in containerized environment with CPU/memory/network limits.

## Why this was chosen

- Isolation from host process.
- Multi-language support with image-per-language approach.
- Reproducible runtime behavior for judges.

## Tradeoffs

- Startup overhead per submission.
- Operational complexity around Docker daemon access.
- Current model is not fully hardened for hostile adversaries.

## Alternative

Judge0/Piston service integration, Firecracker microVMs, gVisor for stronger sandbox guarantees.

## 7) Better Auth + session cookies

## Choice

Session-based auth integrated through Better Auth with Prisma adapter.

## Why this was chosen

- Good compatibility with server-rendered frontend and credentials-included fetch.
- Session model simplifies invalidation and server-side checks.

## Tradeoffs

- Cookie domain/cross-origin setup is sensitive in multi-environment deployments.
- Requires careful CORS + trusted origin setup.

## Alternative

JWT stateless auth; easier service-to-service usage, harder revocation and rotating behavior.

## 8) Zustand for frontend runtime state

## Choice

Use lightweight store over heavier state libraries.

## Why this was chosen

- Small API and low boilerplate.
- Suitable for match/session-level state persistence and hydration.

## Tradeoffs

- Less ecosystem tooling than Redux Toolkit.
- Requires discipline around side effects and subscription cleanup.

## 9) Elo rating and leaderboard updates on match finish

## Choice

Update ratings and leaderboard in same finish transaction.

## Why this was chosen

- Transactional consistency between outcome and ranking state.
- Domain logic centralized in one place (`finishMatchById`).

## Tradeoffs

- Finish path becomes complex and high-impact.
- Any failure on this path delays match closure visibility.

## 10) Key implementation tradeoff examples from code

### Example A: dual invite systems

- Main socket invite flow in `src/sockets/index.ts`
- Friend namespace invite flow in `src/sockets/chatsocket.ts`

Tradeoff: fast feature iteration but duplicated domain logic and inconsistent edge-case handling.

### Example B: leaderboard cache

- `getLeaderboard` caches for 30s in Redis.

Tradeoff: less DB pressure and faster reads, but ranks can appear slightly stale.

### Example C: startup recovery for timeouts

- `ExpirationManager.recover()` replays zset.

Tradeoff: better resilience after restart; complexity in ensuring timers and zset stay aligned.

## 11) Decisions likely to be challenged by interviewers

- Hardcoded OAuth fallback credentials in config.
- `drainDelay: 0` mismatch with known BullMQ behavior.
- Public `POST /api/match/create` route appears unguarded in route config.
- Chat message fetch route currently not protected by session middleware.
- `ORDER BY RANDOM()` question selection may degrade at scale.

Cross-reference:

- Failure specifics and mitigations: [05](./05-security-reliability-failures.md)
- Scalability improvements: [06](./06-scalability-performance-production.md)
- Challenge talking points and improvement roadmap: [08](./08-challenges-limitations-roadmap.md)

