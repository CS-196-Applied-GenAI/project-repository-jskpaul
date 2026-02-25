# Bird-App 2.0 Backend Plan (FastAPI + Chirper SQL Schema)

This document is a step-by-step blueprint for building the backend for Bird-App 2.0 (MVP scope) **without implementing code yet**. It is optimized around:
- the spec’s primary goal: a **fast follower-only, reverse-chronological feed**, and
- the course PDF’s required feature list and the provided **`chirper` SQL schema** (`chirper_full_schema.sql`).

---

## 1) What we’re building (MVP)

### Goals (from spec + PDF)
- **Fast path:** minimize latency from “open app” to “read feed”.
- **Backend architecture:** asynchronous Python with FastAPI.
- **Performance metric:** `GET /feed` returns in **< 200ms** for a user following up to **500** accounts (under realistic indexing, bounded page sizes, and efficient queries).
 - **Grading metric:** each implemented user-facing task from the PDF contributes to grade; aim to cover all.

### In-scope features (from PDF + spec)
- **Account lifecycle**
  - Create an account (unique username, password restrictions).
  - Login (JWT-based).
  - Logout (JWT blacklist using `blacklisted_tokens` table).
  - Update profile (bio, username, profile picture).
- **Social graph**
  - Follow a user.
  - Unfollow a user.
  - Block a user.
  - Unblock a user.
- **Content**
  - Post (Tweet) with character limit (use `tweets.text`, ignore images for now or treat as optional).
  - Delete a post (soft “delete” via ownership check and `ON DELETE CASCADE` for related likes/comments).
  - Retweet a post and unretweet (using `tweets.retweeted_from`).
  - Comments/replies (optional for UI, but table exists; can be basic).
- **Engagement**
  - Like a post.
  - Unlike a post.
- **Timeline**
  - View a feed of recent tweets (reverse chronological, followed users only).
  - Refresh tweet feed (same endpoint; initiated by the client).

### Out-of-scope (explicit)
- Media uploads beyond storing optional `image_url` string.
- DMs, search/discovery, tweet edits.

---

## 2) Architecture blueprint

### Service boundaries (single service, modular internals)
Keep one FastAPI app, split into modules for clarity and testing:
- `app/main.py`: FastAPI app + routers
- `app/core/`: config, security, logging, settings
- `app/db/`: engine/session, base model, migrations integration
- `app/models/`: ORM models (User, Tweet, Follow, Like)
- `app/schemas/`: Pydantic request/response models
- `app/api/`: route handlers grouped by domain (`auth`, `tweets`, `users`, `feed`)
- `app/services/`: domain logic (feed query, follow/like operations)

### Async stack choices (recommended)
Target the provided **MySQL-like `chirper` schema**:
- **DB:** MySQL/MariaDB (as per `USE chirper;` and AUTO_INCREMENT syntax).
- **Option A (ORM-centric):** SQLAlchemy 2.x async ORM + `aiomysql` (or `mysqlclient` sync if you decide not to go fully async to keep things simple).
- **Option B (raw SQL):** `aiomysql` (or equivalent) with hand-written queries mapped into Pydantic models.

Either option can hit <200ms with correct indexing and query patterns; Option A is easier for evolving logic.

### Request lifecycle
- Validate input with **Pydantic** at the edge.
- Authenticate with OAuth2 password flow + JWT bearer tokens.
- Execute 1–2 bounded DB queries per endpoint whenever possible.
- Return compact response payloads for feed speed (avoid heavy nested objects).

### Deployment model (MVP)
- Local dev: app + Postgres via docker-compose (or local Postgres)
- Production-ready posture: environment-based config, migrations, health endpoint, structured logs.

---

## 3) Data model (Chirper schema) designed for fast feed

### Entities

#### `users` (from `chirper_full_schema.sql`)
Core identity and profile.
- `id INT AUTO_INCREMENT PRIMARY KEY`
- `username VARCHAR(50) NOT NULL UNIQUE`
- `password_hash TEXT NOT NULL`
- `email VARCHAR(255) NOT NULL UNIQUE`
- `bio TEXT`
- `profile_picture VARCHAR(255)`
- `name VARCHAR(100)`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

**Constraints**
- `username` unique (also used as login “handle”).
- `email` unique.
- Bio, profile picture, and name support **update profile** functionality.

#### `tweets`
Tweets + retweets.
- `id INT AUTO_INCREMENT PRIMARY KEY`
- `user_id INT NOT NULL` (FK → `users.id`)
- `text VARCHAR(240)` (use as tweet content, apply stricter max in app if desired)
- `image_url VARCHAR(255)` (can be ignored or reserved for later)
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `retweeted_from INT` (FK → `tweets.id`, nullable)
- Indexes: `(user_id)`, `(retweeted_from)`

**Constraints & semantics**
- A “normal tweet” has `retweeted_from IS NULL`.
- A “retweet” has `retweeted_from` set to original tweet id and may have empty `text`.
- Deleting a tweet should cascade to likes/comments and set `retweeted_from` in children to NULL (as per schema).

#### `likes`
Like relationships.
- `tweet_id INT NOT NULL` (FK → `tweets.id` ON DELETE CASCADE)
- `user_id INT NOT NULL` (FK → `users.id` ON DELETE CASCADE)
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- PK: (`tweet_id`, `user_id`)
- Index: `(user_id)`

#### `comments`
Replies/comments to tweets (optional for UI, but table exists).
- `id INT AUTO_INCREMENT PRIMARY KEY`
- `user_id INT NOT NULL` (FK → `users.id` ON DELETE CASCADE)
- `tweet_id INT NOT NULL` (FK → `tweets.id` ON DELETE CASCADE)
- `contents VARCHAR(240)`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- Indexes on `user_id`, `tweet_id`

#### `follows`
Directed “follow” edges.
- `follower_id INT NOT NULL` (FK → `users.id`)
- `followee_id INT NOT NULL` (FK → `users.id`)
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- PK: (`follower_id`, `followee_id`)
- Index: `(followee_id)`

#### `blocks`
Block relationships.
- `blocker_id INT NOT NULL` (FK → `users.id`)
- `blocked_id INT NOT NULL` (FK → `users.id`)
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- PK: (`blocker_id`, `blocked_id`)

**Semantics**
- If A blocks B, then:
  - A should not see content from B (tweets, retweets, comments).
  - B should not see content from A.
  - Follows between A and B should be ignored for feed purposes (and optionally auto-removed).

#### `blacklisted_tokens`
Revoked JWTs (for logout).
- `token VARCHAR(512) PRIMARY KEY`
- `expiration_time INT` (Unix timestamp)
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

**Semantics**
- On logout, insert the token into this table.
- On authenticated requests, reject tokens that appear and are not yet expired.

### Indexing plan (critical for `/feed`)
The provided schema already defines core indexes. For feed performance:
- Ensure composite index on `tweets(user_id, created_at DESC, id DESC)` (if not already effectively covered).
- `follows(follower_id, followee_id)` via PK; `followee_id` index helps reverse lookups.
- Consider index on `blocks(blocker_id, blocked_id)` for fast block checks.

### Feed query strategy (MVP, respecting blocks)
For a given user:
- Fetch tweets where `t.user_id` is a followee of me, **excluding** blocked users (both directions):
  - `SELECT t.*`
  - `FROM tweets t`
  - `JOIN follows f ON f.followee_id = t.user_id`
  - `LEFT JOIN blocks b1 ON b1.blocker_id = :me AND b1.blocked_id = t.user_id`
  - `LEFT JOIN blocks b2 ON b2.blocker_id = t.user_id AND b2.blocked_id = :me`
  - `WHERE f.follower_id = :me AND b1.blocker_id IS NULL AND b2.blocker_id IS NULL`
  - `ORDER BY t.created_at DESC, t.id DESC`
  - `LIMIT :page_size`

Notes:
- With follower count up to 500, this join + index is usually fine with a small page size (e.g., 50).
- Keep payload compact: return tweet id, author handle, content, created_at, liked_by_me (optional).
- Pagination should be cursor-based (`before_created_at` + `before_id`) to avoid deep offsets.

---

## 4) API blueprint (MVP endpoints + contracts, aligned with PDF)

### Common conventions
- **Auth header:** `Authorization: Bearer <token>`
- **Errors:** use consistent JSON error shape (FastAPI `HTTPException` + global handler).
- **Pagination:** use `limit` with sane max; cursor pagination recommended for `/feed` and profile tweets.

### `POST /auth/register`
**Purpose:** Create a new user with a unique username and password credentials.

**Request body (example shape)**
- `username`: string (required, unique)
- `password`: string (required)
- `email`: string (optional; only include if you decide to support it)

**Response (201)**
- `id`
- `handle`
- `created_at`

**Errors**
- 409 if handle already exists
- 422 validation errors

---

### `POST /auth/token` (Login)
**Purpose:** Login, returning a JWT access token (OAuth2 Password flow).

**Request**
- `application/x-www-form-urlencoded`:
  - `username`: username (or email if you support it)
  - `password`

**Response (200)**
- `access_token`: string (JWT)
- `token_type`: `"bearer"`

**Errors**
- 401 invalid credentials

---

### `POST /auth/logout`
**Purpose:** Logout by blacklisting the current JWT.

**Auth:** Required.

**Request**
- No body; uses current bearer token.

**Response (204)**
- Empty body.

**Behavior**
- Insert current token into `blacklisted_tokens` with expiration time from token.
- Future requests with this token are rejected.

---

### `PUT /users/me` (Update profile)
**Purpose:** Update current user’s profile fields (bio, username, profile picture, name).

**Auth:** Required.

**Request body (all optional, at least one present)**
- `username`: new username (unique)
- `bio`
- `profile_picture`
- `name`

**Response (200)**
- Updated user object.

**Errors**
- 409 on duplicate username.

---

### `POST /tweets`
**Auth:** Required.

**Request body**
- `text`: string, max 240 (enforced in app; matches DB column)

**Response (201)**
- `id`
- `author`: `{ id, handle }`
- `content`
- `created_at`
- `like_count` (optional for MVP; can be added later)
- `liked_by_me` (optional; useful for UI consistency)

**Errors**
- 401 if not authenticated
- 422 if content invalid

---

### `DELETE /tweets/{id}`
**Purpose:** Delete a tweet owned by the current user.

**Auth:** Required.

**Behavior**
- Only allow deletion if `tweet.user_id == current_user.id`.
- Use `ON DELETE CASCADE` semantics for likes/comments; retweets’ `retweeted_from` becomes NULL automatically.

**Response (204)**
- Empty.

**Errors**
- 404 if tweet not found or not owned by user (to avoid leaking existence).

---

### `POST /tweets/{id}/retweet`
**Purpose:** Retweet another user’s tweet.

**Auth:** Required.

**Behavior**
- Create a new `tweets` row with:
  - `user_id = current_user.id`
  - `retweeted_from = original_id`
  - `text` may be empty or copy; simplest is empty.
- Enforce idempotency if desired (e.g., prevent multiple retweets of same tweet by same user).

**Response (201)**
- Retweet tweet representation.

---

### `DELETE /tweets/{id}/retweet`
**Purpose:** “Unretweet” a tweet.

**Auth:** Required.

**Behavior**
- Delete the retweet row where `user_id = current_user.id` and `retweeted_from = :id`.

**Response (204)**
- Empty.

---

### `GET /feed`
**Auth:** Required.

**Query params**
- `limit` (default e.g. 50; max e.g. 100)
- Cursor pagination (recommended):
  - `before_created_at` (optional)
  - `before_id` (optional; tie-breaker for stable ordering)

**Response (200)**
- `items`: list of tweets (same minimal tweet shape as above)
- `next_cursor`: `{ before_created_at, before_id }` or `null`

**Performance contract**
- Use one primary query (join `follows` → `tweets`) + optional small query for likes if needed.

---

### `POST /users/{id}/follow`
**Auth:** Required.

**Behavior**
- If not currently following, create follow edge.
- If already following, either:
  - return 200 with “already following” (idempotent), or
  - return 409 (less friendly). Prefer idempotent.

**Response (200/201)**
- `follower_id` (me)
- `followed_id` (target)

**Errors**
- 404 if target user not found
- 400 if attempt to follow self

**Note:** PDF explicitly includes **follow** and **unfollow**:
- Implement `DELETE /users/{id}/follow` for unfollow.

---

### `GET /users/{username}`
**Auth:** Optional (but if you want `liked_by_me`, then auth helps).

**Response (200)**
- `user`: `{ id, handle, created_at }`
- `tweets`: user’s tweets (paginated)
- `is_following` (optional; if auth present)

**Pagination**
- Same cursor pattern as `/feed` for user tweets.

---

### Likes endpoints
Required by PDF:
- `POST /tweets/{id}/like` (auth required, idempotent).
- `DELETE /tweets/{id}/like` (auth required) for **unlike**.

**Response (200/201)**
- `tweet_id`
- `liked: true`

---

### Block/unblock endpoints

**Block**
- `POST /users/{id}/block`
- Inserts into `blocks` (`blocker_id = me`, `blocked_id = id`).
- Optionally removes any follow relationships between the two users.

**Unblock**
- `DELETE /users/{id}/block`
- Deletes corresponding row from `blocks`.

Blocking must affect:
- **Feed queries:** exclude tweets where either user has blocked the other (see feed query above).
- **Profile views & follow actions:** you may disallow follow if a block exists.

---

### Comments endpoints (optional but schema-backed)
- `POST /tweets/{id}/comments`: add a comment.
- `GET /tweets/{id}/comments`: list comments with pagination.

---

## 5) Validation, auth, and security blueprint

### Username validation (Pydantic)
Make validation strict and predictable:
- Normalize: lowercase if desired.
- Suggested regex: starts with letter, then letters/numbers/underscore, length 3–20 (adjust as desired).
- Reject `@` in stored username (UI can render `@{username}`).

### Password policy (MVP)
- Minimum length (e.g., 8)
- Hash using a strong password hasher (e.g., `passlib[bcrypt]`).

### JWT
- Short-lived access token (e.g., 15–60 minutes)
- Store signing secret in env var
- Token claims:
  - `sub`: user id
  - `handle`: optional
  - `exp`, `iat`

### Authorization rules (MVP)
- Only authenticated users can create tweets, follow, like, and view `/feed`.
- Profile (`GET /users/{username}`) can be public.

### Abuse/edge cases to define now
- Follow self (reject)
- Follow nonexistent user (404)
- Like same tweet twice (idempotent)
- Like nonexistent tweet (404)
- Tweet length boundaries and whitespace-only tweets (reject)

---

## 6) Testing strategy (strong, fast feedback)

### Test layers
- **Unit tests (pure Python):** validation, security helpers, cursor pagination encoding/decoding.
- **API tests (FastAPI TestClient / httpx AsyncClient):** endpoint behavior, auth enforcement, error codes.
- **DB integration tests:** run against a real Postgres (preferred via Docker/Testcontainers) to validate indexes and query plans.

### Golden-path API test scenarios (minimum)
- Register → login → create tweet → follow someone → feed shows followed tweets only.
- Feed ordering is stable (created_at desc, id desc).
- Like endpoint is idempotent.
- Cursor pagination returns non-overlapping pages and terminates.

### Performance checks (lightweight but real)
- A repeatable script/test that:
  - seeds: 1 user following 500 accounts, each with N tweets
  - measures `GET /feed?limit=50` latency
  - asserts under target on local machine **or** tracks as metric (don’t hard fail on slower CI if needed)

---

## 7) Observability & operational concerns (MVP-level)
- **Structured logs:** request id, user id (if present), latency per request.
- **Health checks:** `/health` returns ok + db connectivity.
- **CORS:** allow frontend origin(s) in dev; lock down in prod.
- **Migrations:** Alembic (or equivalent) from day 1 to avoid schema drift.

---

## 8) Implementation roadmap (iterative chunks)

The roadmap is intentionally decomposed multiple times until steps are “right-sized”:
- small enough to implement safely with focused tests
- big enough to deliver visible progress each step

### Round 1: Big chunks (milestones)
1. **Project skeleton + configuration**
2. **Database schema + migrations**
3. **Auth (register + token/JWT)**
4. **Tweets (create + profile tweets)**
5. **Follows**
6. **Feed (fast query + pagination)**
7. **Likes**
8. **Hardening: constraints, errors, observability, performance checks**

### Round 2: Break big chunks into incremental deliverables

#### Chunk 1: Project skeleton + configuration
- Create FastAPI app shell with versioned API router and `/health`.
- Add settings management (env vars) and local dev instructions.
- Add DB connection wiring (without models yet) and “DB ping” in health check.
- Add test harness and a first smoke test.

#### Chunk 2: Database schema + migrations
- Define tables: users, tweets, follows, likes.
- Add constraints and indexes (especially for feed).
- Add migration scripts and a reproducible local reset/seed flow (dev-only).
- Add DB integration test verifying tables exist and key constraints behave.

#### Chunk 3: Auth (register + token/JWT)
- Implement password hashing utilities + tests.
- Implement `POST /auth/register` + tests (unique handle, validation).
- Implement `POST /auth/token` + tests (happy + invalid password).
- Implement `get_current_user` dependency + tests for protected routes.

#### Chunk 4: Tweets (create + profile tweets)
- Add `POST /tweets` (auth required) + tests (length validation).
- Add `GET /users/{username}` baseline (user exists/404) + tests.
- Add user tweet listing + pagination + tests.

#### Chunk 5: Follows
- Add follow operation + tests (follow, already-following idempotent, self-follow).
- Add optional unfollow operation + tests (recommended).
- Add “is_following” on profile response when auth present (optional).

#### Chunk 6: Feed (fast query + pagination)
- Implement feed query using join and indexes + tests for “only followed”.
- Add cursor pagination and stable ordering + tests.
- Add optional `liked_by_me` via efficient query strategy + tests.
- Add performance seed + local benchmark script/test.

#### Chunk 7: Likes
- Add like endpoint + tests (idempotent, 404 tweet).
- Add unlike endpoint (recommended) + tests.
- Add like_count (optional) with either:
  - aggregation query on demand (simple, may be slower), or
  - cached counter (more complex; likely unnecessary for MVP).

#### Chunk 8: Hardening
- Global error handling consistency.
- Add request logging middleware, latency metrics.
- Tune indexes/query (EXPLAIN) if feed is slow.

### Round 3: “Right-sized” smallest safe steps (each with tests)

Each step below should be small enough to complete in one sitting and merge safely.

#### Step 0 — Repo hygiene and bootstrapping
- Add `README` backend run instructions (dev).
- Add dependency management and basic formatting/lint config (minimal).
- **Tests:** a single “imports + app starts” test.
- **Done when:** `pytest` passes; `/health` returns 200.

#### Step 1 — Settings + app factory
- Add settings object (env-driven) and instantiate app with routers.
- **Tests:** settings loads defaults; app routes exist.
- **Done when:** can start app locally with env vars.

#### Step 2 — DB connectivity (no schema yet)
- Add async DB engine/session and a `/health` DB check.
- **Tests:** health endpoint returns ok when DB reachable (use test DB).
- **Done when:** a failing DB makes health report degraded/non-200 (your choice, but consistent).

#### Step 3 — Migrations framework
- Add migrations tooling and first empty migration.
- **Tests:** CI/local step that runs migrations on a fresh DB without error.
- **Done when:** a fresh DB can be migrated from zero.

#### Step 4 — Users table + constraints
- Create `users` table migration (handle unique, created_at).
- **Tests:** integration test inserts user; duplicate handle fails.
- **Done when:** constraints verified against real Postgres.

#### Step 5 — Password hashing helper
- Add password hash + verify functions.
- **Tests:** verify correct password true; wrong false; hashes differ across runs.
- **Done when:** helper is used by register/login flows.

#### Step 6 — Register endpoint
- Add `POST /auth/register`.
- **Tests:** 201 creates user; 409 on duplicate handle; 422 on bad handle/password.
- **Done when:** response shape stable and documented.

#### Step 7 — JWT issuance (token endpoint)
- Add `POST /auth/token` issuing JWT.
- **Tests:** valid credentials returns token; invalid returns 401.
- **Done when:** token decodes and includes expected claims.

#### Step 8 — Auth dependency for protected routes
- Add `get_current_user` dependency (Bearer token).
- **Tests:** protected dummy endpoint returns 401 without token, 200 with token.
- **Done when:** reused across tweet/follow/feed endpoints.

#### Step 9 — Tweets table + indexes
- Create `tweets` table migration (author_id FK, created_at, content length constraint).
- Add index `tweets(author_id, created_at desc, id desc)`.
- **Tests:** insert tweet; content length enforced.
- **Done when:** migration + constraints validated.

#### Step 10 — Create tweet endpoint
- Add `POST /tweets` (auth required).
- **Tests:** 201 with token; 401 without; 422 for invalid content.
- **Done when:** tweet persists and response includes author + created_at.

#### Step 11 — Follows table + constraints
- Create `follows` table migration with composite PK and self-follow prevention.
- Index to support feed join.
- **Tests:** follow edge inserted; duplicate prevented; self-follow rejected.
- **Done when:** constraints behave in Postgres.

#### Step 12 — Follow endpoint (idempotent)
- Add `POST /users/{id}/follow` (auth required).
- **Tests:** follow success; second follow is idempotent; 404 on missing user; 400 on self.
- **Done when:** endpoint matches chosen semantics.

#### Step 13 — Profile endpoint (user lookup)
- Add `GET /users/{username}` returning user basics.
- **Tests:** 200 for existing; 404 for missing.
- **Done when:** stable response contract.

#### Step 14 — User tweets listing (paginated)
- Add user tweets list to profile response or separate endpoint (your choice).
- Add cursor pagination.
- **Tests:** ordering stable; pagination returns next cursor and no duplicates.
- **Done when:** UI can render profile timeline efficiently.

#### Step 15 — Feed endpoint (baseline)
- Add `GET /feed` join query + limit cap.
- **Tests:** shows only followed users’ tweets; correct ordering.
- **Done when:** query count and response size are bounded.

#### Step 16 — Feed cursor pagination (stable)
- Add `before_created_at`/`before_id` cursor support.
- **Tests:** page1 + page2 disjoint; stable ordering across pages.
- **Done when:** scrolling experience is correct.

#### Step 17 — Likes table + endpoint (idempotent)
- Create `likes` table migration.
- Add `POST /tweets/{id}/like`.
- **Tests:** idempotent like; 404 on missing tweet; auth required.
- **Done when:** UI can “like” without duplicates.

#### Step 18 — Optional: liked_by_me and/or like_count
- Decide minimal feature:
  - `liked_by_me` computed via EXISTS subquery for current user, or
  - return a separate likes endpoint if you want to avoid extra joins in feed.
- **Tests:** liked_by_me flips after liking.
- **Done when:** no N+1 queries.

#### Step 19 — Performance seed + measurement
- Add a dev-only seed routine to create:
  - 1 user, 500 followed accounts, N tweets each
- Add a benchmark script/test to time `/feed?limit=50`.
- **Tests:** benchmark produces output; optionally assert under threshold locally.
- **Done when:** you can iterate on indexes/query with real data.

#### Step 20 — Hardening sweep
- Add consistent error responses.
- Add request logging with latency.
- Re-run EXPLAIN on feed query and adjust indexes if needed.
- **Tests:** key endpoints still pass; add regression for any bug found.

---

## 9) Review: are steps right-sized?

Checklist applied to each Step 0–20:
- **Single responsibility:** each step changes one conceptual thing (schema, auth, tweet, follow, feed, like).
- **Testable:** each step has at least one new/updated test.
- **Reversible:** failures are localized; minimal blast radius.
- **Forward progress:** each step unlocks a real capability for the frontend or next backend step.

If any step feels too big during implementation, split it again using this rule:
- “One migration OR one endpoint OR one query/pagination feature per step.”

