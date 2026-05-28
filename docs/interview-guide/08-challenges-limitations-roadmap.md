# 08 - Interviewer Challenges, Criticisms, and Improvement Plan

This section prepares you for hard interview pushback.

## 1) Things interviewer may challenge

## 1.1 "This has security holes."

Valid criticism:

- Hardcoded OAuth fallback credentials in `apps/server/src/config/config.ts`.
- Unprotected route concerns (`/api/match/create`, `/api/chat/messages`).

Response strategy:

- Acknowledge issue directly.
- Explain this was identified during review.
- Present concrete fix list and priority.

## 1.2 "You duplicated invite logic in two socket modules."

Valid criticism:

- Invite/domain behavior appears in both `sockets/index.ts` and `sockets/chatsocket.ts`.

Response strategy:

- Acknowledge as iteration artifact.
- Explain migration path to single invite service and shared event contract.

## 1.3 "Docker is not enough for untrusted code execution."

Valid criticism:

- True for internet-scale adversarial threat models.

Response strategy:

- Explain current controls and intended production hardening (gVisor/Firecracker, stricter tenant isolation, quotas).

## 1.4 "Question selection with ORDER BY RANDOM won’t scale."

Valid criticism:

- Full-table random sort can become expensive as question bank grows.

Response strategy:

- Mention planned alternatives (pre-sampled pools, indexed random key ranges, category bucket selection).

## 1.5 "How do you handle stale leaderboard cache?"

Valid criticism:

- 30s cache can show temporary staleness.

Response strategy:

- Explain acceptable UX tradeoff for current scale and propose active invalidation on match finish.

## 2) Weak points summary

- Route-level auth coverage is inconsistent in some paths.
- Secret handling currently unsafe in config fallback.
- Queue worker config has known instability (`drainDelay`).
- Realtime event lifecycle has some cleanup/duplication debt.
- Match create fallback path may create empty question list.

## 3) Better alternatives and tradeoffs

## 3.1 Realtime architecture

Alternative:

- event-sourced architecture with durable stream bus.

Tradeoff:

- stronger traceability and replay vs significantly more complexity and ops overhead.

## 3.2 Judge platform

Alternative:

- dedicated judge service or third-party runner.

Tradeoff:

- stronger security and scale vs integration complexity and potentially higher cost.

## 3.3 Data consistency model

Alternative:

- durable event log + materialized views.

Tradeoff:

- better audit/replay vs higher implementation burden for project stage.

## 4) Interview-ready "ownership" statements

Use these phrases:

- "I intentionally optimized for realtime UX and development velocity first."
- "I documented and prioritized hardening tasks after validating core loop."
- "I can explain both current implementation and production migration plan."
- "I consider route authorization and secret handling top-priority technical debt."

## 5) Concrete roadmap (what to improve next)

## Phase 1: Security and correctness hardening

- Remove hardcoded secrets.
- Add auth middleware to all user-sensitive routes.
- Validate request ownership from session only.
- Fix queue configuration and startup checks.

## Phase 2: Realtime simplification

- Unify invite systems into one domain module.
- Normalize event contracts and payload schemas.
- Restore and test socket listener cleanup.

## Phase 3: Scale and operability

- Add Socket.io Redis adapter and horizontal scaling.
- Introduce full observability stack and SLOs.
- Improve question sampling algorithm.

## Phase 4: Judge hardening

- Stronger sandbox model, abuse controls, and workload quotas.
- Potential language-specific worker pools.

## 6) STAR stories you can prepare

1. **Race condition fix**: queue dedupe and reservation lock.
2. **Reliability fix**: timeout recovery using zset replay on restart.
3. **Performance improvement**: leaderboard caching and async worker separation.
4. **Future ownership**: security hardening roadmap with phased delivery.

## 7) How to answer criticism well

Template:

1. Agree with the valid concern.
2. Explain current tradeoff context.
3. Show current mitigation.
4. Propose concrete next-step improvement.

Example:

"Yes, route coverage is incomplete in two places. Core paths are session-gated, but these two endpoints should be protected. I have already documented this as priority zero and would patch middleware plus request ownership checks immediately."

Cross-reference:

- Security and failure details: [05](./05-security-reliability-failures.md)
- Scalability/perf roadmap: [06](./06-scalability-performance-production.md)
- Q&A practice: [07](./07-interview-qa.md)

