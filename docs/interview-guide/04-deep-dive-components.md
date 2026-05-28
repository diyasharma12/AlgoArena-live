# 04 - Deep Dive Components

This section breaks down the most critical internals you should be able to explain confidently.

## 1) Matchmaking engine deep dive

Primary files:

- `apps/server/src/services/match.service.ts`
- `apps/server/src/sockets/matchMaker.ts`
- `apps/server/src/helpers/matchMaker.helper.ts`
- `apps/server/src/utils/constants.ts`

## 1.1 Queueing users safely

`queueUserForMatch(userId)`:

- Checks if user already has active match (`user_match:{userId}`).
- Uses Lua script with `LPOS` + `LPUSH` to prevent duplicate queue entries.

Why Lua:

- Atomic check-and-add at Redis side.
- Avoids race from separate read and write commands.

## 1.2 Pairing logic

`startMatchMaker(io)` uses:

- `BRPOP(waiting_users, 0)` for blocking pop
- `RPOP(waiting_users)` for second user

If no opponent:

- requester is requeued and loop sleeps for 5 seconds.

If match creation fails:

- both users are requeued.

## 1.3 Match creation correctness controls

`createMatch(requesterId, opponentId)`:

- creates deterministic match key using sorted IDs + UUID.
- acquires lock key with `SET NX PX 5000`.
- reserves both users with `SET user_match:* NX EX MATCH_TTL`.
- fetches 5 random questions from Prisma raw SQL.
- writes match hash as `RUNNING`.
- schedules timeout (`ExpirationManager.schedule`).
- increments worker busy count (`workerManager.incrementBusy`).

This addresses race conditions where users could be assigned multiple active matches.

## 2) Match lifecycle finalization deep dive

Primary file:

- `apps/server/src/helpers/finishMatch.helper.ts`

## 2.1 What finalization does

`finishMatchById(matchId, opts)` handles:

- status transition to `FINISHING`
- score computation from Redis submission hashes
- winner determination and tie-break
- transactional persistence in PostgreSQL
- rating and leaderboard updates
- Redis cleanup and event emission

## 2.2 Scoring and tie-break algorithm

For each user:

- Parse submission records from Redis hash.
- Keep earliest accepted submission per question.
- Score = number of distinct solved questions.

Tie-break:

- Compare sum of accepted submission timestamps.
- Lower sum (faster cumulative solves) wins.

## 2.3 Rating update algorithm

- Elo expected score formula:
  - `expectedA = 1 / (1 + 10^((ratingB - ratingA)/400))`
- K-factor = 32
- Draw = 0.5

New ratings are written in the same transaction as match persistence.

## 2.4 Retry and rollback behavior

- retries transaction up to 3 times (1 second delay).
- if all retries fail, resets Redis match status back to `RUNNING`.

This avoids permanently stuck `FINISHING` state for transient DB failures.

## 3) Submission + judge pipeline deep dive

Primary files:

- `apps/server/src/controllers/submit.controller.ts`
- `apps/server/src/controllers/matchPractice.controller.ts`
- `apps/worker/src/workers/codeWorker.ts`
- `packages/queue/src/index.ts`
- `apps/server/src/sockets/index.ts`

## 3.1 Submission validation path

Match submit (`/api/submit`) validates:

- active session
- match exists and is `RUNNING`
- user is requester/opponent
- question belongs to that match
- language in allowlist (`cpp`, `python`, `javascript`)

Practice submit (`/api/submit/solo`) validates:

- active session
- question exists

## 3.2 Worker execution flow

Job payload includes:

- code, language, testcases
- submissionId, matchId, userId, questionId

Worker steps:

1. Create temp job folder under `HOME_DIR/docker_temp/job-{id}`.
2. Save source and testcase input files.
3. Build Docker command with strict limits.
4. Execute command with `exec(..., timeout: 10000)`.
5. Read outputs and compare against expected output.
6. Parse stderr with language-aware parser.
7. Publish `submission_result` through Redis pub/sub.
8. Delete temp folder.

## 3.3 Notable security and UX behaviors

- Explicitly blocks `#include <bits/stdc++.h>` in C++ submissions.
- Uses `--network none`, memory 128MB, CPU 0.5.
- Publishes detailed per-testcase results for frontend rendering.

## 3.4 Event bridge

Worker publishes Redis `match_events`.
Server subscribes and emits to sockets:

- `submission_result` to user room
- `opponent_submission_passed` to opponent
- `match:finished` to match room

## 4) Realtime state sync deep dive

Primary files:

- `apps/web/hooks/useSocket.ts`
- `apps/web/lib/socket.ts`
- `apps/server/src/sockets/index.ts`

## 4.1 Connection and registration

- client creates singleton socket and emits `register { userId }`.
- server maps userId to socketId in memory maps.
- user joins personal room `socket.join(userId)`.

## 4.2 Rejoin flow

On connect, frontend calls:

- `/api/match/getmatch/:slug` or `/api/match/active`

Then:

- emits `join_match` for room sync
- hydrates match state in Zustand
- restores timing and question data

This supports browser refresh/reconnect while match is still running.

## 4.3 Cleanup caveat

`useSocket.ts` contains commented-out cleanup listeners.
Risk: duplicate handlers after multiple mounts in some UI flows.

## 5) Expiration and crash recovery deep dive

Primary files:

- `apps/server/src/utils/ExpirationManager.ts`
- `apps/server/src/sockets/matchSweeper.ts`
- `apps/server/src/index.ts`

## 5.1 Timeout scheduling

At match creation:

- schedule in-memory timer
- also add matchId to Redis sorted set with expiration timestamp

## 5.2 Restart recovery

On server boot (`index.ts`):

- `expirationManager.recover()` scans zset:
  - already expired: finish immediately
  - still active: reschedule timer with remaining delay

This protects against losing only in-process timers after restart.

## 6) Leaderboard deep dive

Primary files:

- `apps/server/src/controllers/leaderboard.controller.ts`
- `apps/server/src/helpers/finishMatch.helper.ts`

Update path:

- finish match transaction updates per-user leaderboard counters.

Read path:

- `GET /api/leaderboard` reads top 100 ordered by rating, streak, wins.
- Caches serialized result in Redis 30 seconds.

Potential issue:

- cache key invalidation is TTL-only; leaderboard can show stale rank briefly after match completion.

## 7) Social graph and friend duels deep dive

Primary files:

- `apps/server/src/controllers/socail.controller.ts`
- `apps/server/src/sockets/index.ts`
- `apps/server/src/sockets/chatsocket.ts`

Highlights:

- friend request and friendship persisted in Prisma models.
- realtime friend request notification uses personal room emits.
- duel invites have timeout semantics.

Caveat:

- invite logic exists in two socket modules with partially overlapping responsibilities.

## 8) Deep-dive interview checklist

Be ready to whiteboard these in detail:

1. Queue -> match creation -> socket start flow
2. Submit -> worker -> pubsub -> socket result flow
3. Finish -> transaction -> cleanup -> leaderboard update flow
4. Timeout and restart recovery flow

## 9) Important algorithms and data structures used

### Redis data structures

- **List**: waiting queue (`waiting_users`) for BRPOP/RPOP matchmaking.
- **Hash**: active match state and per-user submission maps.
- **Sorted set**: expiration ordering by timestamp (`match_expirations`).
- **String keys**: user-to-match reservation (`user_match:{userId}`).

### Match scoring algorithm

- Build solved-question maps for each user using earliest accepted submission.
- Score by set cardinality.
- Tie-break with cumulative accepted timestamp.

### Rating algorithm

- Elo expected-score formula with fixed K-factor 32.

### Concurrency control pattern

- lock key + `SET NX` reservations + Lua dedupe, used as distributed synchronization primitives.

Cross-reference:

- For architecture overview, read [01](./01-architecture-and-flow.md)
- For reliability and edge cases, read [05](./05-security-reliability-failures.md)

