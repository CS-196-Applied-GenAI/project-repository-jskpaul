# 🐦 Bird-App 2.0: Technical Specification

**Project Goal:** A high-speed, text-centric social media platform focused on rapid information consumption via a "Follower-Only" feed.

---

## 🎯 1. Audience & Goals

* **Target Audience:** Information junkies and professionals who want a "no-noise" chronological update from specific sources.
* **Primary Goal:** Minimize the time between "Open App" and "Read Content."
* **Secondary Goal:** Demonstrate a robust, scalable backend architecture using asynchronous Python.

---

## 🛠 2. Tech Stack

| Layer | Technology | Reason |
| --- | --- | --- |
| **Frontend** | React + Tailwind CSS | Fast UI development and highly responsive "State" management. |
| **Backend** | **FastAPI (Python)** | High-concurrency support with `async/await` for real-time feed fetching. |
| **Database** | PostgreSQL | Relational integrity for complex "Follower" and "Tweet" associations. |
| **Auth** | OAuth2 + JWT | Stateless authentication for faster request processing. |

---

## 📋 3. Functional Requirements (User Stories)

### **Core Identity**

* **Registration:** Users can create an account with a unique `@handle`.
* **Authentication:** Users can log in securely via JWT.
* **Social Graph:** Users can follow/unfollow others to curate their information stream.

### **The "Fast" Content Loop**

* **Posting:** Users can post text-only updates (Max 280 characters).
* **The Feed:** A reverse-chronological timeline containing **only** posts from followed accounts.
* **Interactions:** Users can "Like" a tweet to acknowledge information without leaving a comment.

---

## 🔌 4. API Design (MVP Endpoints)

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Register a new user account. |
| `POST` | `/auth/token` | Login and receive a JWT access token. |
| `GET` | `/feed` | Retrieve the latest tweets from followed users. |
| `POST` | `/tweets` | Create a new tweet (Text-only). |
| `POST` | `/users/{id}/follow` | Follow a specific user ID. |
| `GET` | `/users/{username}` | View a user's profile and their specific tweets. |

---

## 🚀 5. Performance & Success Metrics

* **Feed Latency:** The `/feed` endpoint must return results in under 200ms for users following up to 500 accounts.
* **Validation:** All inputs (Tweet length, Username format) must be validated via **Pydantic** models on the backend.
* **Mobile-First:** The UI must be optimized for fast scrolling on mobile devices.

---

## 🚫 6. Out of Scope (Phase 2)

To ensure a successful MVP, the following features are **explicitly excluded**:

* **Media Uploads:** No images or videos (Text-only for speed).
* **Direct Messages:** No private 1-on-1 chatting.
* **Search/Discovery:** No "Explore" page or algorithmic recommendations.
* **Edit Button:** Tweets are immutable once posted.

---
