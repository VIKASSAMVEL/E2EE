# E2EE Chat System

## Overview
End-to-end encrypted real-time chat app (React + Spring Boot). Frontend handles all crypto (WebCrypto API), backend routes messages via WebSocket without decrypting payloads.

## Project Structure
- `frontend/` - Vite + React TypeScript UI
- `backend/` - Spring Boot REST + WebSocket API
- `docs/` - design docs and project plan

## Quickstart

### Backend
1. `cd backend`
2. `./mvnw clean package`
3. `./mvnw spring-boot:run`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Build
- Frontend: `npm run build` (in frontend)
- Backend: `./mvnw verify` (in backend)

## Notes
- User auth via JWT in backend
- RSA key management and AES payload encryption on client
- WebSocket endpoint for message routing

## Contributing
1. Fork repo
2. Create branch `feature/*` or `fix/*`
3. Open PR with testing details
