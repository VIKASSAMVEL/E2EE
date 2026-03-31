# 📄 E2EE Chat System Project Plan

## Overview
Design and implement a secure, real-time messaging web application that ensures end-to-end encryption (E2EE) using RSA + AES. This system ensures total privacy through a Zero-Trust Server architecture and will be deployed entirely on free-tier platforms.

## Project Type
WEB

## Success Criteria
- [ ] Users can register and log in.
- [ ] Messages are encrypted natively in the browser (WebCrypto API) before transmitting.
- [ ] Backend routes WebSocket messages without being able to decrypt payloads.
- [ ] App is fully deployed with CI/CD flows on Vercel (Frontend) and Render (Backend), using MongoDB Atlas.
- [ ] Key management mimics Signal/WhatsApp (persistent local device keys via IndexedDB).

## Tech Stack
- **Frontend**: React (Vercel) - Vite-based, clean UI.
- **Backend**: Java + Spring Boot (Render) - WebSocket endpoints and REST APIs.
- **Database**: MongoDB Atlas (Free Tier) - Storing users, public keys, and encrypted payloads.
- **Cryptography**: Web Crypto API (Client) / `javax.crypto` (Server verification, though server never gets private keys).

## File Structure
```
d:\e2ee\
├── frontend/       # React SPA
│   ├── src/
│   │   ├── crypto/ # WebCrypto utilities (RSA/AES)
│   │   ├── hooks/  # WebSocket & Auth hooks
│   │   ├── pages/  # Login, Chat Dashboard
│   │   └── App.tsx
│   └── package.json
├── backend/        # Spring Boot application
│   ├── src/main/java/com/e2ee/chat/
│   │   ├── config/ # WebSocket & Security config
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── repository/
│   │   └── services/
│   └── pom.xml
└── docs/           # Architecture & Plans
```

## Task Breakdown

### Phase 1: Foundation (Backend & Database)
- **Task 1: Setup Spring Boot & MongoDB Atlas Integration**
  - **Agent**: `backend-specialist`
  - **Skill**: `clean-code`, `database-design`
  - **Priority**: P0
  - **Dependencies**: None
  - **Input**: MongoDB Atlas connection string.
  - **Output**: Spring Boot baseline with MongoDB connection and User schema.
  - **Verify**: App builds successfully and connects to the Atlas cluster.

- **Task 2: Implement User Registration & Authentication (JWT)**
  - **Agent**: `backend-specialist`
  - **Skill**: `api-patterns`
  - **Priority**: P0
  - **Dependencies**: Task 1
  - **Input**: User model with `username`, `password_hash`, `public_key`.
  - **Output**: `/api/auth/register` and `/api/auth/login` REST endpoints returning JWTs.
  - **Verify**: Postman/curl can successfully register a user and receive a JWT.

### Phase 2: Core Backend (Messaging)
- **Task 3: Configure Spring Boot WebSockets**
  - **Agent**: `backend-specialist`
  - **Skill**: `api-patterns`
  - **Priority**: P1
  - **Dependencies**: Task 2
  - **Input**: JWT Authentication layer.
  - **Output**: Secured STOMP/WebSocket endpoint (`/ws/chat`) configured for user-to-user routing.
  - **Verify**: A generic WebSocket client can connect using a valid JWT and exchange ping/pong.

### Phase 3: Frontend Foundation & Cryptography
- **Task 4: React Application Setup & UI Skeleton**
  - **Agent**: `frontend-specialist`
  - **Skill**: `frontend-design`, `react-patterns`
  - **Priority**: P2
  - **Dependencies**: None
  - **Input**: Vite React TS template.
  - **Output**: Functional routing (Login -> Chat), modern UI components (TailwindCSS).
  - **Verify**: Frontend runs locally and renders the login and chat layout.

- **Task 5: Implement WebCrypto API Layer (RSA + AES)**
  - **Agent**: `frontend-specialist`
  - **Skill**: `security-auditor` equivalent for JS crypto
  - **Priority**: P1
  - **Dependencies**: Task 4
  - **Input**: Empty crypto service file.
  - **Output**: Functions for RSA keypair generation, AES-GCM encryption/decryption, exporting/importing keys to/from IndexedDB.
  - **Verify**: Unit tests or console outputs confirming that encrypting and decrypting a dummy string works within the browser.

### Phase 4: Integration (End-to-End Chat)
- **Task 6: Connect React to Auth & WebSocket Routing**
  - **Agent**: `frontend-specialist`
  - **Skill**: `react-patterns`
  - **Priority**: P1
  - **Dependencies**: Task 2, Task 3, Task 4
  - **Input**: Backend API endpoints.
  - **Output**: React app logging in, fetching public keys of other users, and connecting to the WebSocket broker.
  - **Verify**: State logs show active WS connection and JWT presence in local storage.

- **Task 7: Hook Cryptography to WebSocket Messages**
  - **Agent**: `frontend-specialist`
  - **Skill**: `react-patterns`
  - **Priority**: P1
  - **Dependencies**: Task 5, Task 6
  - **Input**: Functional WebSockets and Crypto utility.
  - **Output**: Sent messages intercept, generate AES key, encrypt payload, encrypt AES key with recipient public key, and send. Recipient receives and decrypts.
  - **Verify**: Two local browser windows can chat, and network traffic shows 100% encrypted ciphertexts.

### Phase 5: Deployment
- **Task 8: CI/CD & Free Tier Deployments**
  - **Agent**: `devops-engineer`
  - **Skill**: `bash-linux`
  - **Priority**: P3
  - **Dependencies**: Task 7
  - **Input**: Finished codebases.
  - **Output**: Spring Boot deployed to Render; React deployed to Vercel.
  - **Verify**: The public Vercel URL can successfully register accounts and chat through the Render WebSocket.

## ✅ PHASE X: VERIFICATION (MANDATORY SCRIPT EXECUTION)
- [ ] Run Lint & Build (`npm run build` / `./mvnw verify`)
- [ ] **Security Scan**: `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`
- [ ] **Accessibility / Lighthouse Audit**: Verify React performance and a11y.
- [ ] Manual E2E test via Vercel URL.
- [ ] No purple/violet hex codes used in UI.
- [ ] **Status**: Pending execution after implementation.
