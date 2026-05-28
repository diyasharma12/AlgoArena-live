# 06 - Scalability, Performance, and Production Readiness

## 1) Current performance model

## 1.1 Fast path choices

- Active match state and queue in Redis (low latency read/write).
- Async grading with BullMQ to keep API responsive.
- Leaderboard read cache in Redis (`EX 30`).
- Client state persistence in Zustand for quick refresh recovery.

## 1.2 Potential bottlenecks

1. Single matchmaker loop in one process (`BRPOP` loop).
2. Docker startup overhead per submission.
3. `ORDER BY RANDOM()` question selection in SQL.
4. In-memory socket maps per server instance (without distributed adapter).
5. Finish transaction doing multiple writes in one path under load.

## 2) Scaling strategy by subsystem

## 2.1 API and sockets

Current:

- One server instance can maintain local socket map.

Scale target:

- Use Socket.io Redis adapter for multi-instance pub/sub and room coherence.
- Externalize user-presence mapping (Redis) if needed.

## 2.2 Matchmaking

Current:

- one loop pops from Redis waiting list and pairs users.

Scale target:

- move to Redis Streams or dedicated matchmaking service with shard strategy.
- support rating buckets/region affinity/latency class for smarter pairing.

## 2.3 Worker and judge

Current:

- single queue and worker type.

Scale target:

- autoscale workers by queue depth and latency SLO.
- isolate workers by language pools.
- pre-warm containers or runner pools to reduce cold-start overhead.

## 2.4 Database

Current:

- strong finish transaction writes to core tables.

Scale target:

- add read replicas for leaderboard/profile heavy reads.
- partition/archive old submissions and match telemetry.
- ensure proper indexing around frequently queried stats fields.

## 3) Performance opportunities in current code

## 3.1 Question fetch optimization

Current:

- random questions via `ORDER BY RANDOM() LIMIT 5`.

Improvement:

- precomputed randomized IDs or bucketed sampling by difficulty.

## 3.2 Reduce socket duplicate listeners

Current:

- cleanup callbacks commented in `useSocket.ts`.

Improvement:

- restore handler cleanup in effect return to avoid duplicate emissions and memory leaks.

## 3.3 Leaderboard cache invalidation

Current:

- TTL-only invalidation.

Improvement:

- explicit cache bust on `finishMatchById` success.

## 3.4 Queue config stability

Current:

- `drainDelay: 0` may cause worker issue.

Improvement:

- set positive drain delay and validate startup queue health.

## 3.5 API input constraints

Current:

- no explicit payload size cap for source code.

Improvement:

- enforce code length and request size limits to protect memory and worker queue.

## 4) Production-grade concerns checklist

## 4.1 Observability

Recommended:

- structured logging with request/match/submission IDs
- centralized logs and error tracking
- metrics for:
  - queue depth
  - submission latency p50/p95/p99
  - match creation success/failure
  - socket connection/reconnect counts

## 4.2 SLOs and alerting

Possible targets:

- match start latency < 2s p95
- submission result latency < 6s p95
- API auth route availability > 99.9%

Alert on:

- queue backlog growth
- repeated finish transaction failures
- worker crash loops

## 4.3 Deployment topology

Typical shape:

- Web: Vercel or containerized frontend service
- Server: containerized Node service
- Worker: separate autoscaled worker deployment
- Redis: managed Redis
- Postgres: managed Postgres with backups and PITR

## 4.4 Data lifecycle

Recommended:

- retention policy for raw submission artifacts
- periodic cleanup for old ephemeral data
- backup and restore drills for DB

## 4.5 Security operations

Recommended:

- secret manager integration
- image vulnerability scanning
- least-privilege network policies
- regular dependency upgrades

## 5) Real-world production roadmap

Phase 1 (stabilization):

- secure routes and secrets
- fix queue config
- restore socket cleanup
- add basic rate limiting

Phase 2 (operability):

- observability stack
- queue and job dashboards
- replay tooling for failed submissions

Phase 3 (scale):

- distributed socket adapter
- judge autoscaling and hardened sandbox
- smarter matchmaking and question selection

Cross-reference:

- detailed failure handling and security gaps: [05](./05-security-reliability-failures.md)
- criticisms and interviewer challenge points: [08](./08-challenges-limitations-roadmap.md)

