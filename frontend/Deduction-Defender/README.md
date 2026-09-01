# Deduction Defender

Frontend prototype for AI-powered retail deduction review. Talks to a FastAPI backend expected at `http://localhost:8001`.

## Setup

```bash
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`).

## Backend requirement

This frontend calls two endpoints on your backend, which must be running separately on port 8001:

- `POST /api/chat` — body `{ "question": string }`, returns `{ "answer": string }`
- `POST /api/upload` — multipart form with `file` and `note`, returns `{ "answer": string, "metadata": {...} }`

If the backend isn't running, the UI will show a "backend is not reachable" message instead of crashing.

## Project structure

```
deduction-defender/
├── index.html          # Vite HTML entry, loads src/main.jsx
├── package.json         # dependencies + scripts
├── vite.config.js        # Vite + React plugin config
├── src/
│   ├── main.jsx          # mounts <App /> into #root
│   └── App.jsx           # all UI: dashboard, analyze, assistant, workflow views
└── README.md
```