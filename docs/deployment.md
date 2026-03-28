# Deployment Guide

## Local Docker

```bash
docker compose up --build
```

## Environment Variables

### Backend

- `OPENAI_API_KEY`: optional, enables OpenAI-backed insights
- `OLLAMA_BASE_URL`: optional local model fallback
- `SIM_DEFAULT_TICK_HOURS`: default tick duration, default `6`
- `WS_BROADCAST_MS`: WebSocket update interval, default `100`

### Frontend

- `NEXT_PUBLIC_API_BASE_URL`: defaults to `http://localhost:8000`
- `NEXT_PUBLIC_WS_URL`: defaults to `ws://localhost:8000/ws`

## Local Env Files

- Copy [backend/.env.example](C:/Users/utkar/Desktop/Replica/backend/.env.example) to `backend/.env`
- Copy [frontend/.env.local.example](C:/Users/utkar/Desktop/Replica/frontend/.env.local.example) to `frontend/.env.local`
