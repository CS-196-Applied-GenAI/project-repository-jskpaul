# Bird-App Frontend

React + Vite + Tailwind CSS. No backend connection yet — all pages are UI-only with placeholder data.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — tweet feed (placeholder) |
| `/register` | Account creation |
| `/login` | Login |
| `/post` | Compose a new tweet |
| `/tweets/:tweetId/reply` | Compose a reply to a tweet |
| `/tweets/:tweetId/replies` | View replies to a tweet |
| `/users/:username` | Profile (own or another user) |
| Any other path | 404 error page |

## Build

```bash
npm run build
npm run preview
```
