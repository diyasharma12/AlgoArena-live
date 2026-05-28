# 02 - Modules and Important Files

This section is a practical map of major modules and the most interview-relevant files.

## 1) Root and tooling

- `package.json` (root): Turbo tasks, service scripts, db scripts
- `turbo.json`: task graph, env passthrough, caching rules
- `docker-compose.yml`: local PostgreSQL and Redis
- `.env.example`: required variables across apps

## 2) Frontend (`apps/web`)

## 2.1 App routing

- `app/layout.tsx`: root layout, metadata, global listeners, toaster
- `app/(marketing)/page.tsx`: landing page
- `app/(dashboard)/dashboard/page.tsx`: mode cards (quick match/practice/friend duel)
- `app/code/page.tsx`: solo practice code arena
- `app/code/[slug]/page.tsx`: active match coding arena
- `proxy.ts`: auth redirect guard middleware

## 2.2 Networking and auth

- `lib/api.ts`: API base URL constant
- `lib/socket.ts`: client socket singleton + register event
- `lib/auth-client.ts`: Better Auth client hooks

## 2.3 Realtime hooks and listeners

- `hooks/useSocket.ts`: central socket event subscriptions
- `hooks/useMatchMaker.ts`: queue/cancel quick match
- `hooks/useMatchListener.ts`: listens to `match_started`, routes into match page
- `components/FriendInvitationListener.tsx`: friend request realtime UI
- `components/GlobalChatListener.tsx`: chat/global listener setup

## 2.4 State management (Zustand)

- `stores/matchStore.ts`: match metadata, timing, question/code mapping
- `stores/submissionStore.ts`: per-question latest result
- `stores/matchProgressStore.ts`: solved counts for self/opponent
- `stores/matchResultStore.ts`: match winner/result popup state
- `stores/friendsListStore.ts`: online users etc.
- `stores/useMatchStore.ts`: queue/loading flags for matchmaking UI

## 2.5 UI-heavy modules

- `components/Code/CodeEnvironment.tsx`: split-pane coding layout
- `components/editor/editor.tsx`: editor wrapper
- `components/Friendship/*`: social UI, friend list, chat surfaces
- `components/Dashboard/*`: cards, sidebars, quick action components

## 3) Backend (`apps/server`)

## 3.1 Server bootstrap

- `src/index.ts`: HTTP server creation, socket setup, expiration recovery
- `src/app.ts`: Express app + route mounting + CORS + auth handler
- `src/config/config.ts`: env exports (contains sensitive fallback values currently)

## 3.2 Route modules

- `src/routes/match.route.ts`
- `src/routes/submit.route.ts`
- `src/routes/social.route.ts`
- `src/routes/chat.route.ts`
- `src/routes/setQuestions.route.ts`
- `src/routes/leaderboard.route.ts`

## 3.3 Controllers

- `src/controllers/match.controller.ts`: queue/cancel/get/finish/create endpoints
- `src/controllers/submit.controller.ts`: match submit entrypoint
- `src/controllers/matchPractice.controller.ts`: practice submit entrypoint
- `src/controllers/socail.controller.ts`: friend search/requests/accept/reject/list
- `src/controllers/chat.controller.ts`: message history endpoint
- `src/controllers/leaderboard.controller.ts`: leaderboard fetch + seed
- `src/controllers/setQuestions.controller.ts`: random question fetch

## 3.4 Services/helpers

- `src/services/match.service.ts`: queue and match retrieval operations
- `src/helpers/matchMaker.helper.ts`: active match creation and key reservation
- `src/helpers/finishMatch.helper.ts`: full match finalization transaction

## 3.5 Realtime socket modules

- `src/sockets/index.ts`: main namespace events and pub/sub forwarding
- `src/sockets/matchMaker.ts`: blocking queue-driven matcher loop
- `src/sockets/chatsocket.ts`: `/friends` namespace and invite-based match creation
- `src/utils/socketInstance.ts`: singleton socket server access

## 3.6 Infra utility modules

- `src/utils/constants.ts`: queue/match key names and durations
- `src/utils/ExpirationManager.ts`: timeout schedule + startup recover
- `src/utils/WorkerManager.ts`: busy count + pause/resume signals for worker
- `src/middleware/middleware.ts`: auth session guard

## 4) Worker (`apps/worker`)

- `src/index.ts`: worker boot
- `src/workers/codeWorker.ts`: Docker sandbox execution and result publication
- `src/utils/errorParser.ts`: language-specific error parsing and normalization

## 5) Shared packages

### `packages/db`

- `prisma/schema.prisma`: domain schema (users, matches, submissions, social graph, leaderboard)
- `src/index.ts`: Prisma client export
- `src/seed.ts`: seed logic
- `prisma/migrations/*`: schema evolution history

### `packages/queue`

- `src/index.ts`: Redis connection, BullMQ queue/events, worker factory

### `packages/questions-set`

- `questions.json`: question dataset asset

### `packages/types`

- `src/types.ts`: shared type contracts

## 6) API inventory (high value)

### Match

- `POST /api/match`: queue for random match
- `POST /api/match/cancel`: remove from queue
- `POST /api/match/finish/:matchId`: force finish/forfeit flow
- `GET /api/match/getmatch/:matchId`: fetch specific running match
- `GET /api/match/active`: fetch currently active match

### Submission

- `POST /api/submit`: submit in active PvP match
- `POST /api/submit/solo`: submit in practice mode

### Social and chat

- `GET /api/social/search`
- `POST /api/social/request`
- `GET /api/social/requests`
- `POST /api/social/accept`
- `POST /api/social/reject`
- `GET /api/social/friends`
- `POST /api/chat/messages`

### Questions and leaderboard

- `POST /api/setquestions`
- `GET /api/leaderboard`
- `POST /api/leaderboard/seed`

## 7) Realtime events inventory

Main socket (`src/sockets/index.ts`):

- Incoming: `register`, `join_match`, `invite_friend`, `invite_response`
- Outgoing: `onlineUsers`, `match:ready`, `match_started`, `submission_result`, `opponent_submission_passed`, `match:finished`, invite-related events

Friend namespace (`src/sockets/chatsocket.ts`, `/friends`):

- Incoming: `sendMessage`, `typing`, `stopTyping`, `matchInvite`, `respondInvite`
- Outgoing: `receiveMessage`, `messageSent`, `typing`, `stopTyping`, `matchStarted`

## 8) Data models most likely discussed in interviews

From `packages/db/prisma/schema.prisma`:

- `User`
- `Question`
- `Match`, `MatchParticipant`, `MatchQuestion`
- `Submission`
- `Friend`, `FriendRequest`
- `Message`
- `LeaderboardEntry`
- Better Auth models: `Account`, `Session`, `Verification`

Cross-reference:

- For architecture and exact flow, read [01](./01-architecture-and-flow.md)
- For design rationale and tradeoffs, read [03](./03-design-decisions-and-tradeoffs.md)
- For critical internals, read [04](./04-deep-dive-components.md)

