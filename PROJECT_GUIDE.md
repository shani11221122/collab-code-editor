# Collab — Realtime Collaborative Code Editor

> **Purpose of this file:** Everything you need to understand this project is here —
> architecture, folder structure, every API endpoint, every socket event, data
> flow, run instructions, and design decisions. Read this one file and you know
> what is happening in the whole codebase.

---

## 1. What is this?

Collab is a **browser-based, realtime collaborative code editor** — like a mini
Google-Docs-for-code. Multiple people join a **room**, open files, and type
together. Every keystroke is synced between everyone in the room in real time.
It also has presence (who is online), live cursors, a chat panel, version
history, and code execution (JS / Python / C++ / Java) via a Judge0 sandbox.

### Built with (the stack)

| Layer     | Technology                                          |
|-----------|-----------------------------------------------------|
| Frontend  | React 19 + Vite + Tailwind CSS 4 + Monaco editor    |
| Realtime  | Socket.io (WebSockets)                              |
| Backend   | Node.js + Express                                    |
| Database  | MongoDB (Mongoose ODM)                               |
| Scaling   | Redis pub/sub adapter for Socket.io (graceful fallback) |
| Code exec | Judge0 (RapidAPI) — optional, needs API key          |
| Tests     | Jest (Operational Transform unit tests)              |

---

## 2. Folder structure (the map)

```
collab-code-editor/
├── README.md
├── PROJECT_GUIDE.md            ← you are here
│
├── client/                     ← React + Vite frontend
│   ├── index.html              ← entry HTML (fonts, meta, #root)
│   ├── vite.config.js          ← Vite + React + Tailwind plugins
│   ├── scripts/socket-e2e-test.cjs  ← 2-client realtime E2E test (Day 9)
│   └── src/
│       ├── main.jsx            ← createRoot + BrowserRouter bootstrap
│       ├── App.jsx             ← route table (/, /room/:roomId, /login, /signup)
│       ├── index.css           ← the ENTIRE design system (see §9)
│       ├── config.js           ← ONE file with API_URL / SOCKET_URL
│       ├── socket.js           ← shared Socket.io connection (auto-reconnect)
│       ├── api/axios.js        ← axios instance + JWT interceptor
│       ├── lib/languages.js    ← language metadata (label, Monaco id, Judge0 id)
│       ├── pages/
│       │   ├── Home.jsx        ← landing/hero page (create/join room)
│       │   ├── Login.jsx       ← auth card
│       │   ├── Signup.jsx      ← auth card (fixed in Day 9 — was missing!)
│       │   └── RoomPage.jsx    ← the main IDE workspace
│       └── components/
│           ├── Editor.jsx      ← Monaco + OT ops + remote cursors + custom theme
│           ├── Sidebar.jsx     ← file explorer (+ inline new-file form)
│           ├── Toolbar.jsx     ← brand, room id, language, presence, run, history
│           ├── OutputPanel.jsx ← terminal-style output console
│           ├── Chat.jsx        ← file-scoped team chat
│           └── VersionHistory.jsx ← checkpoints + restore dropdown
│
└── server/                     ← Node/Express + Socket.io backend
    ├── server.js               ← app, routes, Socket.io logic (in-memory OT state)
    ├── .env                    ← PORT, MONGO_URI, JWT_SECRET, JUDGE0 keys (gitignored)
    ├── .env.example            ← template for .env
    └── src/
        ├── ot.js               ← ★ transform(opA, opB) — Operational Transform core
        ├── ot.test.js          ← ★ Jest unit tests for OT (Day 9)
        ├── config/db.js        ← mongoose.connect
        ├── config/redis.js     ← Redis pub/sub clients for the Socket.io adapter
        ├── models/
        │   ├── User.js         ← username, email, hashed password
        │   ├── Room.js         ← roomId (nanoid 8), name
        │   ├── File.js         ← name, language, content, versions[] snapshot array
        │   └── Document.js     ← legacy/unused model (kept for history)
        ├── routes/
---

## 3. Architecture & data flow (the big picture)

```
┌─────────┐   HTTP (REST)   ┌─────────────────────────────┐
│ Browser │ ──────────────► │ Express server              │
│  (React)│    /api/*       │  └─ auth / rooms / files /  │──► MongoDB
│         │                 │     execute                 │
│         │                 └─────────────────────────────┘
│         │   WebSocket     ┌─────────────────────────────┐
│         │ ──────────────► │ Socket.io server            │
│         │   /socket.io    │  ├─ rooms, sockets, events  │
│         │                 │  └─ Redis adapter (optional)│──► Redis (pub/sub)
└─────────┘                 └─────────────────────────────┘
```

### The collaboration model (this is the heart)

There are **three layers** that make realtime editing work:

1. **Operations (ops)** — every edit becomes one tiny object:
   ```js
   { type: 'insert', pos: 5, char: 'X' }          // insert "X" at index 5
   { type: 'delete', pos: 2, length: 3 }          // delete 3 chars from index 2
   ```
   Monaco provides these directly through its change events.

2. **Operational Transform (`ot.js`)** — when two people edit at the "same time",
   the server takes the newcomer's op and *replays* it against every op that
   happened in the meantime, shifting positions so both edits survive:
   ```js
   // User A inserts at pos 5 ("X"); User B inserted "YY" at pos 2 first
   transform({insert, pos: 5}, {insert, pos: 2, char: 'YY'})
     → { insert, pos: 7 }      // A's op pushed right by 2
   ```
   This is what makes the app **conflict-free** — no "last writer wins".

3. **Revision counter** — each file keeps a `revision` (starts at 0, +1 per op).
   Every op is sent with the sender's last-known revision; the server transforms
   it against `operations[revision..]` so stale ops still apply correctly.

### Live-edit flow, step by step

```
You type "X" in Monaco
  → handleEditorChange() maps the change → op
  → socket.emit('operation', { fileId, op, revision })

Server:
  → transforms op against missed ops
  → pushes op, revision++, baseContent updated
  → socket.to(fileId).emit('remote-operation', {op, revision})  [to peers]
  → socket.emit('operation-ack', {revision})                    [back to you]
  → debounced (2s) auto-save to MongoDB

Peer:
  → 'remote-operation' → apply op to own content → Monaco value sync
  → revisionRef = revision   (keeps its revision in lockstep)
```

### Multi-server scaling (Redis adapter)

By default all state is **in-memory per server instance** (`fileState`,
`fileUsers` objects in `server.js`). That is fine for one instance.

---

## 4. REST API reference

Base URL: `http://localhost:5000`

| Method | Endpoint                                  | Body / Notes                     |
|--------|-------------------------------------------|----------------------------------|
| GET    | `/health`                                 | `{status:"Server is running"}`   |
| POST   | `/api/auth/signup`                        | `{username,email,password}` → JWT + user |
| POST   | `/api/auth/login`                         | `{email,password}` → JWT + user  |
| POST   | `/api/rooms`                              | `{name?}` → creates room + default `index.js` |
| GET    | `/api/rooms/:roomId`                      | room lookup (404 if missing)     |
| GET    | `/api/rooms/:roomId/files`                | all files in room                |
| POST   | `/api/rooms/:roomId/files`                | `{name, language?}` → new file   |
| POST   | `/api/files/:fileId/versions`             | push a snapshot checkpoint       |
| GET    | `/api/files/:fileId/versions`             | list version snapshots           |
| POST   | `/api/files/:fileId/versions/:versionId/restore` | restore content + broadcast `file-restored` |
| POST   | `/api/execute`                            | `{code, language}` → Judge0 output |

Auth middleware (`authMiddleware.js`) is wired and validates
`Authorization: Bearer <jwt>` for any route that uses it (currently none do —
rooms are link-shared by design).

---

## 5. Socket.io event reference

Events emitted by **clients**:

| Event            | Payload                                  | Meaning                          |
|------------------|------------------------------------------|----------------------------------|
| `join-file`      | `(fileId, username)`                     | join a file's room (also used on reconnect) |
| `leave-file`     | `(fileId)`                               | stop receiving that file's events |
| `operation`      | `{fileId, op, revision}`                 | submit an edit op                |
| `cursor-move`    | `{fileId, position:{lineNumber,column}}` | broadcast cursor location        |
| `chat-message`   | `{fileId, message, username}`            | send a chat message              |

Events emitted by the **server**:

| Event                | Payload                                        | Meaning                      |
|----------------------|------------------------------------------------|------------------------------|
| `init-file`          | `{content, revision}`                          | full doc state on join       |
| `remote-operation`   | `{op, revision}`                               | peer's edit after OT, apply it |
| `operation-ack`      | `{revision}`                                   | server's new revision        |
| `remote-cursor`      | `{socketId, position, username, color}`        | peer's cursor location       |
| `users-update`       | `[{username,color}]`                           | presence list for the room   |
| `chat-message`       | `{username, message, at}`                      | relayed chat message         |
| `file-restored`      | `{content, revision}`                          | broadcast after version restore |

### Connection resilience (Day 9)

- **Client** (`socket.js`): `reconnection: true`, 5 attempts, 1s delay.
- **Editor** re-emits `join-file` on every `connect` event — after a blip the
  client re-syncs the latest content + revision from the server instead of
  building on stale state.
- **Server** lets `disconnect` breathe: users are only removed from the presence
  list after a **3-second grace period** (`DISCONNECT_GRACE_MS`), so a 0.5s
  WiFi flicker does not cause a "left → returned" flicker in the UI.

---

## 6. Key code paths (read these first)

| File                                   | Why it matters                                  |
|----------------------------------------|-------------------------------------------------|
| `server/src/ot.js`                     | ★ The OT conflict-resolution algorithm          |
| `server/server.js`                     | All socket handlers, in-memory state, restore route, Redis init |
| `client/src/components/Editor.jsx`     | The collaborative editor — ops out, remote ops in, custom Monaco theme |
| `client/src/pages/RoomPage.jsx`        | IDE layout, room validation/error state, run button wiring |
| `client/src/index.css`                 | Complete design system (CSS variables + component classes, §9) |
| `client/src/socket.js`                 | Single shared socket + reconnect options        |

---

## 7. How to run locally

Prerequisites: **Node 18+**, **MongoDB** running on `127.0.0.1:27017`
(optional: **Redis** on `localhost:6379` for multi-instance mode).

```bash
# 1) Backend
cd server
npm install
cp .env.example .env        # if you don't have .env yet — set MONGO_URI & JWT_SECRET
npm run dev                 # nodemon → http://localhost:5000

# 2) Frontend (new terminal)
cd client
npm install
npm run dev                 # Vite → http://localhost:5173
```

### Tests & E2E

```bash
cd server
npm test                    # 13 Jest cases for ot.js (all green)

# Optional: realtime 2-client E2E (needs server running; run from client/)
cd ../client
node scripts/socket-e2e-test.cjs
```

---

## 8. Day-by-day build log (what each commit added)

| Day | Focus |
|-----|-------|
| 1   | Express server, MongoDB connect, `/health` |
| 2   | React + Vite + Monaco editor, basic layout |
| 3   | Socket.io realtime broadcast (broadcast room) |
| 4   | ★ Operational Transform `ot.js` — insert/delete conflict resolution |
| 5   | Rooms, multi-file support, file-scoped sockets |
| 6   | JWT auth, user model, live presence, cursor positions |
| 7   | MongoDB persistence with debounced 2s auto-save + version history/restore |
| 8   | Code execution via Judge0 + output panel + team chat UI |
| 9   | ★ Redis adapter, reconnect re-sync, 3s disconnect grace, Jest OT tests, invalid-room error page, premium UI redesign, full docs |

---

## 9. Design system (`client/src/index.css`)

The entire UI is driven by **CSS variables + component classes** defined in one
file. Pages/components never hard-code colors — they consume these tokens.

**Tokens (in `:root`):**
- Surfaces: `--bg` (#0a0e14) → `--surface-1/2/3` (light→dark panels), `--surface-hover`
- Text: `--text-1/2/3` (primary → muted)
- Accents: `--accent` (emerald #10b981), `--accent-2` (indigo #6366f1)
- State: `--danger` (#f43f5e), `--warn` (#f5a524)
- Hairlines: `--border`, `--border-strong` (very faint slate borders, no heavy shadows)

**Component classes** (all prefixed `cce-`):
- Buttons: `cce-btn` + `cce-btn-primary` / `-ghost` / `-ghost-2` / `-danger`, `cce-ico-btn`
- Inputs: `cce-input`, `cce-input-sm`, `cce-select`
- Chrome: `cce-app` (page bg with radial glows), `cce-bg-grid` (faint engineering grid)
- Workspace: `cce-toolbar`, `cce-brand(-mark)`, `cce-room-pill`, `cce-vdivider`,
  `cce-sidebar`, `cce-pane-head`, `cce-file-item(-is-active)`, `cce-file-icon`,
  `cce-terminal(-head/-body)`, `cce-chat-panel`, `cce-msg(-is-mine)`, `cce-composer`,
  `cce-dropdown`, `cce-remote-chip`
- Presence: `cce-avatar(-stack)`, `cce-dot(-live/-reconnect/-offline)`, `cce-pill`
- Pages: `cce-auth(-card)`, `cce-field`, `cce-form-error`, `cce-nav`,
  `cce-hero(-title/-sub/-cta/-join)`, `cce-code-window` (mock code block with
  syntax classes `cce-tok-kw/fn/str/num/cmt/op`), `cce-feature`, `cce-footer`
- Utilities: `cce-mono`, `cce-empty`, `cce-spinner(-sm)`, `cce-fade-up`, `cce-caret`
- Keyframes: `cce-pulse`, `cce-spin`, `cce-fade-up`, `cce-blink`

The Monaco editor uses a **custom theme** (`cce-dark`, defined in
`Editor.jsx → beforeMount`) so even the code pane matches the app palette
(background `#0e141c`, emerald cursor, indigo keywords).

**Fonts:** Inter (UI) + JetBrains Mono (code) loaded in `index.html`.

---

## 10. Known limitations & next steps (be honest in interviews)

- `fileState` / `fileUsers` live per instance — true multi-instance needs these
  moved into Redis (documented in §3).
- OT handles simple insert/delete; *ranged replacement* is split into
  delete+insert ops. Undo across peers is not yet operation-canceling level.
- Executing code requires a Judge0 API key (`.env`). Empty code is rejected up
  front with a friendly message; provider/network failures surface the real
  reason in the terminal (e.g. *"Could not reach the Judge0 sandbox — check
  your network and JUDGE0_API_KEY"*).
- Auth exists (JWT + bcrypt) but room endpoints are open by design (link-sharing).

**Interview talking points:**
> "I implemented Operational Transform for conflict-free concurrent editing and
> wrote unit tests for it." • "I added the Socket.io Redis adapter so events
> propagate across multiple server instances." • "I handled reconnects by
> re-joining the file and discarding stale revisions." • "I designed a complete
> dark UI system with CSS variables and a custom Monaco theme."

---

*End of guide — if you understand §2–§6, you understand the project.*