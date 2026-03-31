# Software Requirements Document (SRD)

## Project: End-to-End Encrypted Chat System

---

## 1. Purpose
The objective is to design and implement a secure, real-time messaging system that ensures end-to-end encryption (E2EE) using a hybrid cryptographic model (RSA + AES), enabling confidential communication between users over untrusted networks.

## 2. Scope
This system will:
* Enable real-time messaging between users.
* Ensure only the sender and receiver can read messages.
* Provide secure key exchange and session management.
* Support multi-client communication via server mediation (without exposing plaintext).

## 3. Stakeholders
* **End Users (clients)**
* **System Administrator** (optional monitoring, no message access)
* **Developers / Maintainers**

## 4. System Overview
### Architecture: Client-Server Model (Zero-Trust Server)
* **Client Application:** Handles all encryption and decryption operations locally.
* **Server:** Routes messages and manages connections but cannot decrypt payloads.

---

## 5. Core Functional Requirements

### 5.1 User Management
* Register users with username and password.
* Generate RSA key pair on registration (client-side).
* Store the public key on the server.

### 5.2 Authentication
* Secure login using hashed credentials (bcrypt).
* Session management via session token (JWT or session ID).

### 5.3 Key Management
* Each client maintains an RSA public/private key pair.
* Public keys are stored on the server and are publicly queryable by other registered users.
* Private keys never leave the client device.

### 5.4 Secure Messaging
**Message Flow:**
1. Sender fetches the receiver’s public key from the server.
2. Sender generates a random AES session key.
3. Sender encrypts the message using the AES session key.
4. Sender encrypts the AES session key using the receiver’s RSA public key.
5. Sender transmits the encrypted message and encrypted AES key to the server.
6. Server routes the payload to the receiver.
7. Receiver decrypts the AES key using their private RSA key.
8. Receiver decrypts the message using the decrypted AES session key.

### 5.5 Real-Time Communication
* Facilitate instant message delivery using WebSockets or TCP sockets.
* Maintain and broadcast online/offline presence status.

### 5.6 Message Storage (Optional Advanced)
* Store only encrypted messages in the database.
* Strictly no plaintext logging of message content.

### 5.7 Group Chat (Advanced)
* Utilize a shared AES key per group.
* Implement secure key distribution mechanisms for group members.

### 5.8 Message Integrity
* Ensure message integrity using HMAC or digital signatures to prevent tampering.

---

## 6. Non-Functional Requirements

### 6.1 Security
* End-to-end encryption is mandatory for all user communications.
* Zero plaintext exposure on the server (Zero-Trust architecture).
* Secure key storage on the client side.

### 6.2 Performance
* Message delivery latency should be < 200ms under normal network conditions.
* The system should support a baseline of 100+ concurrent active users.

### 6.3 Scalability
* The server architecture must support horizontal scaling.
* Prefer stateless communication for REST APIs.

### 6.4 Reliability
* Implement a retry mechanism for failed message deliveries.
* Implement a message acknowledgment system (delivery receipts).

### 6.5 Usability
* Provide a clean and simple User Interface (CLI or GUI).
* Display clear message delivery indicators (sent, delivered).

---

## 7. System Architecture

### 7.1 Components
**Client:**
* UI Layer (React Web App or JavaFX Desktop App)
* Encryption Module (Client-side Cryptography)
* Network Module (WebSocket and HTTP Clients)

**Server:**
* Authentication Module
* Message Router (WebSocket Handler)
* Key Storage (Public keys database)

### 7.2 High-Level Flow
`Client A → Encrypt → Server → Forward → Client B → Decrypt`

---

## 8. Cryptographic Design

### 8.1 Algorithms
* **Key Exchange:** RSA (2048-bit)
* **Message Encryption:** AES (256-bit)
* **Hashing:** SHA-256
* **Integrity:** HMAC

### 8.2 Encryption Strategy
* Hybrid encryption combining RSA and AES.
* *(Future Enhancement)* Implement Forward Secrecy using Diffie-Hellman or Double Ratchet Algorithm.

---

## 9. API Design (Server)

### 9.1 Authentication APIs
* `POST /api/auth/register`
* `POST /api/auth/login`

### 9.2 Key APIs
* `GET /api/keys/{userId}`

### 9.3 Messaging (WebSocket)
* **Endpoint:** `ws://server/chat`
* **Message Format:**
```json
{
  "sender": "userA",
  "receiver": "userB",
  "encryptedMessage": "<AES-encrypted-payload>",
  "encryptedKey": "<RSA-encrypted-AES-key>",
  "timestamp": "2026-03-31T12:00:00Z"
}
```

---

## 10. Database Design

### 10.1 Users Table
* `user_id` (Primary Key / UUID)
* `username` (Unique string)
* `password_hash` (bcrypt hash)
* `public_key` (RSA public key string)

### 10.2 Messages Table (Optional)
* `message_id` (Primary Key / UUID)
* `sender_id` (Foreign Key -> Users)
* `receiver_id` (Foreign Key -> Users)
* `encrypted_payload` (Text)
* `timestamp` (DateTime)

---

## 11. Assumptions & Constraints
* Clients can be trusted to securely manage their private keys.
* The server is considered untrusted and must never have access to plaintext messages.
* The underlying network might be insecure, making E2EE strictly necessary.

---

## 12. Threat Model

### 12.1 Attacks Considered
* **Man-in-the-middle (MITM)**
* **Replay attacks**
* **Message tampering**

### 12.2 Mitigations
* Utilize public key verification to prevent MITM.
* Use nonces and timestamps to prevent replay attacks.
* Apply digital signatures or HMAC to prevent tampering.

---

## 13. Testing Requirements
* **Functional Testing:** Verify correct encryption/decryption cycles and key exchange protocols.
* **Security Testing:** Simulate MITM attacks and validate encryption algorithm strength.
* **Performance Testing:** Load test the WebSocket connections with multiple simulated clients.

---

## 14. Recommended Technology Stack
* **Frontend:** React (Vercel) or JavaFX
* **Backend:** Java + Spring Boot (Render/Railway)
* **Real-time:** WebSockets
* **Database:** MongoDB Atlas or PostgreSQL
* **Cryptography:** Web Crypto API (Client-side JS) / `javax.crypto` (Java)
