# 05 - Security, Reliability, and Failure Modes

This chapter documents realistic risks, current controls, and recommended improvements based on the implementation.

## 1) Security considerations

## 1.1 Authentication and access control

Current controls:

- Session validation middleware `isActiveSession` in `apps/server/src/middleware/middleware.ts`.
- Protected routes for match/submit/friends (partially).

Gaps to note:

- `POST /api/match/create` route appears unprotected in `match.route.ts`.
- `POST /api/chat/messages` route is not guarded by session middleware.

Recommendation:

- Require `isActiveSession` for all mutation and data-read routes containing user-scoped data.
- Derive `userId` from session only (avoid accepting arbitrary userId in body/query where possible).

## 1.2 Secret management

Risk found:

- `apps/server/src/config/config.ts` contains fallback Google client ID/secret literals.

Recommendation:

- Remove hardcoded fallback credentials entirely.
- Fail fast with startup validation if required secrets are missing.

## 1.3 Code execution sandbox

Current controls:

- Executes in Docker with:
  - `--network none`
  - `--memory=128m`
  - `--cpus=0.5`
  - execution timeout 10s
- per-job temp directories cleaned with `fs.rm(..., force: true)`.

Residual risk:

- Host Docker socket and daemon security context are still sensitive.
- Language runtimes are not deeply sandboxed at syscall level.

Recommendation:

- Move to stronger isolation for untrusted workloads (gVisor/Firecracker).
- Add container image pinning and regular CVE scanning.

## 1.4 Input validation and abuse control

Current behavior:

- Language allowlist exists.
- Match participation checks exist before submit.

Missing safeguards:

- No explicit rate limiting on submit/match endpoints.
- Potentially large payloads/code size not constrained in route layer.

Recommendation:

- Add request body limits and endpoint rate limits.
- Add anti-spam controls for friend requests and invites.

## 2) Reliability and consistency controls

## 2.1 Match state consistency

Existing controls:

- Redis lock key during match creation.
- User reservation via `SET NX` for active match keys.
- Queue dedupe script for waiting list.

Failure handling:

- Requeue users if match creation fails.

## 2.2 Finalization reliability

Existing controls:

- `FINISHING` status transition.
- DB transaction retry loop (3 attempts).
- Revert to `RUNNING` on final failure.

Benefit:

- Prevents accidental permanent lock of match finalization in many transient failures.

## 2.3 Timeout reliability

Existing controls:

- In-process timers (`ExpirationManager.schedule`).
- Redis zset for durable timeout metadata.
- Startup recovery scans zset and re-schedules or finishes stale matches.

## 2.4 Worker lifecycle control

Existing controls:

- `WorkerManager` increments/decrements global busy count.
- publish `RESUME`/`PAUSE` signals for worker when count transitions.

Known issue:

- Queue worker option `drainDelay: 0` conflicts with known BullMQ expectation (`> 0`) and can crash startup.

## 3) Common failure scenarios and current handling

## Scenario A: User disconnects during queue

- server disconnect handler removes user from waiting list (`lrem`).
- helps reduce stale queued entries.

## Scenario B: User refreshes during active match

- frontend reconnect logic calls `/api/match/active` or `/api/match/getmatch/:id`.
- rejoins room and rehydrates state.

## Scenario C: Worker execution error / compile error

- error parser maps stderr to user-facing error type.
- result is still published to socket with details.

## Scenario D: Server restarts mid-match

- in-memory timers are lost, but zset recovery attempts to restore timeout behavior.

## Scenario E: Match finish fails due to temporary DB issue

- retries with backoff.
- status rollback on failure.

## 4) Race conditions and edge cases worth discussing

## 4.1 Invite races and duplication

- Duplicate invite pathways in two socket modules can cause inconsistent behavior and maintenance complexity.

## 4.2 Listener cleanup in frontend socket hook

- `useSocket.ts` cleanup handlers are commented; repeated mounting can stack listeners.

## 4.3 Question selection fairness and scale

- `ORDER BY RANDOM()` can become expensive and less controlled as question table grows.

## 4.4 Stale leaderboard cache windows

- 30-second TTL means users may briefly see outdated ranks after match completion.

## 4.5 Manual match fallback without questions

In `createManualMatch`, fallback branch may create running match with empty question list if helper returns null.

## 5) Suggested hardening backlog

Priority 0:

- remove hardcoded secrets from code
- protect all sensitive routes with session middleware
- fix BullMQ `drainDelay` config

Priority 1:

- unify invite flows into one domain path
- restore socket listener cleanup on frontend
- add endpoint rate limits and body size caps

Priority 2:

- migrate judge isolation to stronger sandboxing
- add structured observability (correlation IDs, queue metrics, alerting)

Cross-reference:

- Scalability and performance implications: [06](./06-scalability-performance-production.md)
- Challenge/criticism preparation: [08](./08-challenges-limitations-roadmap.md)

