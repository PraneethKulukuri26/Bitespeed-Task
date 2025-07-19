# Bitespeed Backend Task: Identity Reconciliation

## Overview
This project implements the [Bitespeed Identity Reconciliation Task](https://bitespeed.notion.site/Bitespeed-Backend-Task-Identity-Reconciliation-1fb21bb2a930802eb896d4409460375c) as part of the internship submission process. The goal is to build an API that, given an email and/or phone number, returns a unified view of a user's identity, reconciling multiple records that may refer to the same person.

---

## Table of Contents
- [Setup](#setup)
- [API Usage](#api-usage)
- [Identity Reconciliation Logic](#identity-reconciliation-logic)
- [Test Cases](#test-cases)
  - [Basic Scenarios](#basic-scenarios)
  - [Edge Cases](#edge-cases)
- [Project Structure](#project-structure)
- [Notes](#notes)

---

## Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd bitespped
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the server**
   ```bash
   npm start
   # or
   node src/index.ts
   ```
   The server will start on `http://localhost:3000`.

---

## API Usage

### **POST /identify**
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "phoneNumber": "1234567890"
  }
  ```
  - Either or both fields may be present.

- **Response:**
  ```json
  {
    "contact": {
      "primaryContactId": 1,
      "emails": ["user@example.com"],
      "phoneNumbers": ["1234567890"],
      "secondaryContactIds": [2, 3]
    }
  }
  ```

- **Error Response:**
  ```json
  { "error": "At least one of email or phoneNumber is required." }
  ```

---

## Identity Reconciliation Logic

- If both email and phone number are new, create a new primary contact.
- If either matches an existing contact, link them:
  - If both match different contacts, merge them (one becomes primary, the other secondary, and all their secondaries are relinked).
  - If both match the same contact, return the unified identity.
  - If only one matches, add the new info as a secondary contact linked to the primary.
- Always return the full unified identity.
- No duplicate emails or phone numbers for the same user.
- All contacts for a user are linked via `linkedId` and `linkPrecedence`.

---

## Test Cases

### Basic Scenarios

#### 1. **New User (Both Email and Phone are New)**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","phoneNumber":"1111111111"}'
```
- **Expected:** Creates a new primary contact.

#### 2. **Existing User (Email Matches, New Phone)**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","phoneNumber":"2222222222"}'
```
- **Expected:** Links new phone as secondary to the existing primary.

#### 3. **Existing User (Phone Matches, New Email)**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","phoneNumber":"1111111111"}'
```
- **Expected:** Links new email as secondary to the existing primary.

#### 4. **Merge Two Primaries (Email and Phone Belong to Different Primaries)**
- Create two separate primaries:
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie@example.com","phoneNumber":"3333333333"}'

curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"dave@example.com","phoneNumber":"4444444444"}'
```
- Now, send a request that links them:
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie@example.com","phoneNumber":"4444444444"}'
```
- **Expected:** Merges the two primaries, one becomes secondary, all secondaries are relinked.

#### 5. **Idempotency (Repeat Same Request)**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","phoneNumber":"1111111111"}'
```
- **Expected:** No duplicates are created. The response is the same as the first time.

---

### Edge Cases

#### **A. Both Matches Are Secondaries of Different Primaries**
- If you send a request where the email matches a secondary of Primary 2 and the phone matches a secondary of Primary 1, the system will merge both primaries under the oldest one, and all secondaries (including the former primary and its secondaries) will be relinked to the oldest primary.

#### **B. Chain Merging**
- If a secondary points to a primary that is itself merged into another primary, all secondaries are recursively relinked to the oldest primary.

#### **C. Multiple Secondaries**
- If a primary has multiple secondaries, and another primary with its own secondaries is merged, all secondaries from both are relinked to the oldest primary.

#### **D. Repeated Merges**
- The system is idempotent: repeated merges or requests with the same data do not create duplicates or break the link structure.

#### **E. Null or Missing Fields**
- If both email and phone number are missing, the API returns a 400 error.

#### **F. Soft Deletes**
- The system supports a `deletedAt` field, but soft-deleted contacts are not currently filtered out. (You can extend this logic if needed.)

---

## Project Structure

- `src/index.ts` — Express server entry point
- `src/routes/identify.ts` — API route for /identify
- `src/services/identifyService.ts` — Core identity reconciliation logic
- `src/db/index.ts` — SQLite database connection and schema setup
- `src/schema/init.sql` — SQL schema for the contacts table

---

## Main Packages Used

- **express**: Fast, unopinionated, minimalist web framework for Node.js. Used to create the HTTP server and define API routes.
- **better-sqlite3**: A performant SQLite3 module for Node.js. Used for synchronous, easy-to-use database operations.
- **typescript**: A strongly typed programming language that builds on JavaScript. Used for type safety and modern development features.
- **ts-node**: TypeScript execution environment for Node.js, used for development.
- **@types/** packages: TypeScript type definitions for Node.js, Express, and better-sqlite3.

---

## Notes
- This project is implemented using Node.js, Express, and SQLite (via better-sqlite3).
- All logic is based on the official [Bitespeed Backend Task description](https://bitespeed.notion.site/Bitespeed-Backend-Task-Identity-Reconciliation-1fb21bb2a930802eb896d4409460375c).
- For any questions or improvements, please refer to the code comments and the official task link above. 