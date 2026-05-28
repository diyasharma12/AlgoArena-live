# 07 - Interview Q&A Bank (with 3 Answer Styles)

Use this as revision material before interviews.

Answer format per question:

- **Technical depth**: Full answer for senior interviewer.
- **Simple explanation**: Beginner-friendly version.
- **Interview-ready short**: 20-40 second response.

---

## A) Project overview and architecture

### Q1) What problem does AlgoArena Live solve?

- Technical depth: It provides realtime, competitive DSA practice where users solve coding problems under time pressure in 1v1 matches. The system combines matchmaking, synchronous contest state, asynchronous code judging, and rating updates to simulate practical interview-style coding competition.
- Simple explanation: It lets two people code against each other live and see who solves more problems faster.
- Interview-ready short: It is a realtime 1v1 coding battleground for DSA practice with matchmaking, live judging, and leaderboard progression.

### Q2) Why did you split this into web, server, and worker apps?

- Technical depth: The web app handles UI/UX and state. The server handles REST + auth + sockets + orchestration. The worker isolates CPU-heavy and untrusted code execution through BullMQ jobs and Docker. This separation preserves API responsiveness and allows independent scaling.
- Simple explanation: I separated frontend, backend, and code runner so code execution does not slow down user requests.
- Interview-ready short: I split concerns by runtime so realtime API stays fast while worker handles heavy sandboxed execution.

### Q3) Why use Redis and Postgres together?

- Technical depth: Redis stores high-churn ephemeral match state (queue, active match hash, submission progress, timeout zset), while Postgres stores durable records (users, matches, submissions, leaderboard). This reduces latency on match operations while preserving strong persistence for history.
- Simple explanation: Redis is for fast live game state; Postgres is for permanent data.
- Interview-ready short: Redis handles realtime state; Postgres stores final truth and analytics-friendly history.

### Q4) Why Express backend instead of only Next.js APIs?

- Technical depth: The backend maintains long-lived socket connections and a blocking Redis-driven matchmaker loop (`BRPOP`). Those patterns fit a dedicated Node service better than serverless request lifecycles.
- Simple explanation: Realtime sockets and loops are easier in a standalone backend.
- Interview-ready short: Dedicated Express process gives stable realtime and background orchestration behavior.

---

## B) Matchmaking and realtime behavior

### Q5) How do you avoid duplicate queue entries?

- Technical depth: `queueUserForMatch` uses a Lua script with `LPOS` and `LPUSH` to atomically check-and-add user ID to Redis waiting list. This avoids race conditions from separate read/write commands.
- Simple explanation: I use one atomic Redis script so the same user is not added twice.
- Interview-ready short: Atomic Lua dedupe prevents duplicate queue entries under concurrent requests.

### Q6) Explain the quick-match flow end to end.

- Technical depth: Frontend calls `POST /api/match`; server enqueues user in Redis. Matchmaker loop pops two users, creates match via helper (reserves user keys, selects random questions, stores active hash, schedules timeout), then emits `match_started` and `match:ready` via sockets. Frontend redirects to `/code/[matchId]`.
- Simple explanation: User joins queue, backend pairs two users, creates match, and sends both to coding page.
- Interview-ready short: Queue -> pair -> create active match -> emit socket event -> redirect to match page.

### Q7) How do users recover if they refresh in the middle of a match?

- Technical depth: On socket connect, frontend `useSocket` calls `/api/match/active` or `/api/match/getmatch/:slug`, then emits `join_match`, rehydrates Zustand stores with questions/timing/opponent, and continues from server state.
- Simple explanation: On reconnect, app asks server for active match and rejoins automatically.
- Interview-ready short: Reconnect flow fetches active match and rehydrates local state, then rejoins room.

### Q8) How do you determine the winner?

- Technical depth: On finish, server computes solved sets from Redis submission hashes. Score is number of distinct accepted questions. Tie-break uses cumulative accepted submission timestamp (earlier is better). Optional explicit winner can be passed for forfeit/timeouts.
- Simple explanation: More solved questions wins; if tied, faster overall accepted times wins.
- Interview-ready short: Winner is solved-count first, then earliest cumulative accepted times as tie-break.

---

## C) Submission and judging pipeline

### Q9) Why use BullMQ for submissions?

- Technical depth: Submissions are async and potentially slow due to compile/run. BullMQ decouples request handling from execution, enables worker scaling, and provides queue semantics around job lifecycle.
- Simple explanation: Queue keeps API fast while worker processes code in background.
- Interview-ready short: BullMQ prevents API blocking and gives scalable async execution.

### Q10) Walk through submit to result delivery.

- Technical depth: `/api/submit` validates user/match/question, stores submission record in Redis hash, enqueues `code-execution` job. Worker runs Docker, computes per-testcase results, updates submission state, publishes `match_events`. Server socket subscriber forwards `submission_result` and opponent notifications.
- Simple explanation: API validates and queues code, worker executes it, then server sends results live.
- Interview-ready short: Validate -> enqueue -> sandbox execute -> pub/sub -> socket result to clients.

### Q11) How do you execute code safely?

- Technical depth: Worker executes in Docker with no network, memory and CPU limits, and timeout. Code is written to temporary mount directory, outputs compared to expected testcases, and temp directory deleted afterward.
- Simple explanation: Code runs inside restricted container, not directly on API server.
- Interview-ready short: Docker sandbox + resource limits + timeout + cleanup isolates execution risk.

### Q12) What are limitations of your current sandbox?

- Technical depth: It is better than local process execution but still not high-assurance isolation; stronger containment (microVM/gVisor), strict syscall controls, and better multi-tenant hardening are needed for internet-scale adversarial workloads.
- Simple explanation: It is safe enough for project level, but not enterprise-grade secure sandbox yet.
- Interview-ready short: Good baseline isolation, but production-grade untrusted execution needs stronger sandboxing.

---

## D) Data model, caching, and auth

### Q13) How does leaderboard data stay efficient?

- Technical depth: Leaderboard is read from `LeaderboardEntry` ordered by rating/streak/wins and cached in Redis for 30 seconds to reduce repeated DB reads.
- Simple explanation: Database query is cached shortly to avoid frequent heavy reads.
- Interview-ready short: Redis cache smooths leaderboard read spikes with short TTL.

### Q14) How do you keep match finalization consistent?

- Technical depth: `finishMatchById` marks Redis state to `FINISHING`, computes result, then runs a Prisma transaction that updates ratings, match, participant changes, submissions, and leaderboard. Cleanup occurs after success; retries are attempted on failure.
- Simple explanation: Final match write is done in one transaction so related data stays in sync.
- Interview-ready short: One transactional finish path preserves consistency across ratings/match/submissions.

### Q15) How is authentication implemented?

- Technical depth: Better Auth with Prisma adapter handles session persistence. Express exposes `/api/auth/*` through Better Auth handler. Protected routes use `isActiveSession` middleware and frontend includes credentials in fetch requests.
- Simple explanation: Session cookie auth with middleware checks on secure routes.
- Interview-ready short: Better Auth session cookies + middleware gate protected API actions.

### Q16) What auth/security gaps did you identify?

- Technical depth: Hardcoded OAuth fallback credentials exist in config and must be removed. Some sensitive endpoints are not guarded by session middleware. Chat history endpoint currently accepts body IDs without auth binding.
- Simple explanation: A few routes and secret-handling parts need hardening.
- Interview-ready short: I identified and documented route-guard and secret-management fixes as top hardening tasks.

---

## E) Tradeoffs and alternatives

### Q17) Why not use Kafka instead of Redis/BullMQ?

- Technical depth: Redis/BullMQ gives simple queueing and pub/sub with low operational overhead and tight Node ecosystem fit. Kafka would be stronger for durable event streaming at scale but adds complexity not necessary for current project stage.
- Simple explanation: Redis was enough for current scale and faster to build with.
- Interview-ready short: I optimized for speed and simplicity now; Kafka is a future option for high-scale event durability.

### Q18) Why not store active matches directly in Postgres?

- Technical depth: Active matches are highly mutable and latency-sensitive. Redis hashes and lists are better suited for frequent writes and room state checks. Postgres is used for durable finalized records.
- Simple explanation: Live game state in DB would be slower and heavier.
- Interview-ready short: Redis handles hot state efficiently; Postgres stores finalized truth.

### Q19) Why use Zustand instead of Redux?

- Technical depth: Zustand provides concise local/global state handling with persistence and low boilerplate, suitable for session-oriented match state. Redux Toolkit was unnecessary overhead for this project complexity.
- Simple explanation: Zustand was simpler and fast to implement.
- Interview-ready short: Zustand gave lightweight predictable state without Redux boilerplate.

---

## F) Debugging, failures, and scale

### Q20) What race conditions did you face and how did you handle them?

- Technical depth: Main risk areas were queue duplication and concurrent match creation. I used Redis Lua dedupe, lock keys, and `SET NX` user reservation. Finalization includes retry and rollback behavior to reduce stuck states.
- Simple explanation: I used atomic Redis operations and lock patterns to avoid double matches and inconsistent states.
- Interview-ready short: Atomic queue + lock/reservation strategy prevented key matchmaking races.

### Q21) What happens if server crashes during active matches?

- Technical depth: Match expiration metadata is also written to Redis zset. On boot, `ExpirationManager.recover()` scans zset and either finishes expired matches or reschedules active timers. This restores timeout behavior after restart.
- Simple explanation: Timeout state is recoverable from Redis on restart.
- Interview-ready short: Redis zset + recovery logic restores match timeout lifecycle after crashes.

### Q22) How would you scale to 100k concurrent users?

- Technical depth: Add Socket.io Redis adapter, horizontally scale server/worker, separate matchmaking service, autoscale workers by queue depth, improve question sampling strategy, add observability/SLOs, and harden judge isolation. Also partition historical submission data.
- Simple explanation: Scale sockets, workers, and matchmaking independently, with better infra and monitoring.
- Interview-ready short: Horizontalize realtime + worker layers, externalize coordination, and add stronger ops/observability.

### Q23) What are your biggest technical debts?

- Technical depth: duplicated invite flows, partial route guard gaps, hardcoded fallback secrets, queue config instability (`drainDelay`), and socket listener cleanup gaps. All are documented with concrete remediation phases.
- Simple explanation: Some security and architecture cleanup is needed from rapid iteration.
- Interview-ready short: Main debt is around hardening and consolidating realtime/social flows.

---

## G) Behavioral and STAR-style discussion prompts

### Q24) Tell me about a tough bug you fixed.

- Technical depth: A class of issues involved users being queued/matched inconsistently under concurrency. Root cause was non-atomic queue checks and match creation races. I introduced Lua dedupe and key reservation/lock strategy, reducing duplicate-match risk.
- Simple explanation: Matchmaking races caused weird behavior; atomic Redis logic fixed it.
- Interview-ready short: I fixed matchmaking race bugs by making queue and reservation operations atomic.

### Q25) What would you do differently if you rebuilt this today?

- Technical depth: I would unify invite domains, enforce auth invariants globally, use stronger sandboxing from day one, add structured telemetry and dashboarding early, and design question selection/scoring with scale benchmarks.
- Simple explanation: I would prioritize security and observability earlier.
- Interview-ready short: Same architecture direction, but earlier hardening, observability, and simplification of duplicated flows.

### Q26) How did you make tradeoff decisions?

- Technical depth: I prioritized realtime user experience and delivery speed for core gameplay. I selected practical components (Redis, BullMQ, Socket.io) that fit current scale, then documented known limitations with upgrade paths.
- Simple explanation: I optimized for working core features first, then planned scale/hardening upgrades.
- Interview-ready short: I intentionally chose fast, practical architecture now with a clear roadmap for production-grade upgrades.

---

## H) Follow-up interviewer questions to rehearse

1. How do you prevent cheating through custom output formatting?
2. How do you handle identical timestamps in tie-break?
3. How would you implement anti-collusion and fraud detection?
4. How do you replay failed jobs safely?
5. How would you add language plugins without redeploying worker?
6. How would you isolate one abusive user from exhausting queue resources?
7. How would you run blue/green deploy without dropping active sockets?

Cross-reference:

- Architecture and flow details: [01](./01-architecture-and-flow.md)
- Deep component internals: [04](./04-deep-dive-components.md)
- Weak points and improvement plans: [08](./08-challenges-limitations-roadmap.md)

