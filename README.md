# Collab — Realtime Collaborative Code Editor

A browser-based code editor where multiple people type in the same room in real
time — powered by **Operational Transform** so concurrent edits never overwrite
each other.

Built with **React 19 · Vite · Tailwind CSS 4 · Monaco · Socket.io · Express ·
MongoDB · Redis adapter · Jest**.

## ✨ Features

- ⚡ **Realtime collaboration** — every keystroke is synced instantly over WebSockets
- 🧩 **Conflict-free typing** — Operational Transform merges concurrent edits deterministically
- 👥 **Presence & live cursors** — avatars, online user list, remote cursor chips
- 💬 **Team chat** — file-scoped conversations inside the IDE
- 🕘 **Version history** — manual checkpoints + one-click restore
- 📦 **Run code** — JavaScript / Python / C++ / Java via a Judge0 sandbox
- 🔒 **JWT auth** — signup / login with bcrypt-hashed passwords
- 🚀 **Scalable** — Socket.io Redis adapter for multi-instance deployments
- 🎨 **Custom Monaco theme** — the editor matches the app's dark design system

## 🚀 Quick start

```bash
# 1) Install + prepare env (from repo root, or per-folder)
npm run setup              # installs server + client deps
cp server/.env.example server/.env   # set MONGO_URI / JWT_SECRET

# 2) Backend (port 5000)
npm run dev:server

# 3) Frontend (port 5173, second terminal)
npm run dev:client
```

Open **http://localhost:5173**, click *Create a room*, share the link, and start
typing together. Requires MongoDB on `127.0.0.1:27017` (Redis is optional —
the server gracefully falls back to single-instance mode). The server waits for
the database before listening, so a misconfigured `MONGO_URI` shows up as a
clear boot error instead of random API 500s.

## ☁️ Deploy (Render — single web service)

The Express server also serves the built React app (`client/dist`), so the whole
project deploys as **one** Render web service.

1. Create a **free MongoDB Atlas** cluster and get its **connection string**
   (replace `<password>` with your real password).
2. Push this repo to GitHub, then in Render pick **New → Web Service → repo**.
3. Set environment variables (Render dashboard → Environment):
   - `MONGO_URI` → `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/collab-editor?retryWrites=true&w=majority`
   - `JWT_SECRET` → a long random string
   - `NODE_ENV` → `production`
4. Render runs `npm install && npm --prefix server install && npm --prefix client install && npm --prefix client run build` then `npm start` (see `render.yaml`).

In production the built client uses **relative URLs** (`/api`, same-origin
Socket.io), so it works on any domain with no code changes.

## 🧪 Tests

```bash
npm test        # 13 Jest unit tests for the OT conflict-resolution logic
```

Also ships with `client/scripts/socket-e2e-test.cjs` — a two-client realtime
E2E test (presence, OT broadcast, chat relay, reconnect) that runs against a
live server.

## 📚 Docs

Read **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)** — one file covering the full
architecture, folder map, REST + Socket event reference, data flow, design
system, and run instructions.

## 🛠 Interview highlights

- *Implemented Operational Transform for conflict-free concurrent editing.*
- *Integrated the Socket.io Redis adapter for horizontal scaling across multiple server instances.*
- *Wrote unit tests for the Operational Transform conflict-resolution logic.*
- *Handled disconnects gracefully: reconnect re-sync + 3-second presence grace period.*