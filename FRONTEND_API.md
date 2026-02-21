# Codera Frontend API Reference

Complete reference for frontend integration with the Codera backend.

---

## Base URLs

| Service   | URL                          |
|-----------|------------------------------|
| API       | `http://localhost:3000`      |
| WebSocket | `ws://localhost:3000/ws`     |

---

## REST Endpoints

### `POST /submissions`

Submit code for judging.

**Request Body:**
```json
{
  "userId": "user-123",
  "problemId": "two-sum",
  "languageId": 71,
  "sourceCode": "def solve(nums, target):\n    ..."
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "createdAt": "2026-02-18T06:00:00.000Z",
  "message": "Submission queued for judging"
}
```

**Language IDs:**
| Language    | ID |
|-------------|---:|
| Python 3    | 71 |
| JavaScript  | 63 |
| C++ (GCC)   | 54 |
| C           | 50 |
| Java        | 62 |
| TypeScript  | 74 |
| Go          | 60 |
| Rust        | 73 |

---

### `GET /submissions/:id`

Get submission status and per-testcase results.

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "problemId": "two-sum",
  "languageId": 71,
  "sourceCode": "...",
  "status": "finished",
  "verdict": "AC",
  "totalTests": 3,
  "passedTests": 3,
  "createdAt": "2026-02-18T06:00:00.000Z",
  "results": [
    {
      "id": 1,
      "testcaseIndex": 1,
      "status": "AC",
      "time": "0.012",
      "memory": "3456",
      "createdAt": "2026-02-18T06:00:01.000Z"
    },
    {
      "id": 2,
      "testcaseIndex": 2,
      "status": "AC",
      "time": "0.015",
      "memory": "3600",
      "createdAt": "2026-02-18T06:00:02.000Z"
    }
  ]
}
```

---

### `GET /submissions/user/:userId?limit=20`

Get recent submissions for a user.

**Response (200):**
```json
{
  "submissions": [
    {
      "id": "...",
      "problemId": "two-sum",
      "status": "finished",
      "verdict": "AC",
      "createdAt": "..."
    }
  ]
}
```

---

### `GET /health`

**Response (200):**
```json
{
  "status": "healthy",
  "serverId": "backend-1",
  "timestamp": "2026-02-18T06:00:00.000Z"
}
```

---

## WebSocket Protocol

Connect to `ws://localhost:3000/ws` using native WebSocket.

### Connection Flow

```
1. Connect → receive { type: "connected" }
2. Send auth → receive { type: "auth_success" }
3. Send subscribe → receive { type: "subscribed" }
4. Receive live events as testcases complete
```

### Client → Server Messages

#### Authenticate
```json
{ "type": "auth", "userId": "user-123" }
```

#### Subscribe to submission updates
```json
{ "type": "subscribe_submission", "submissionId": "550e8400-..." }
```

#### Ping
```json
{ "type": "ping" }
```

### Server → Client Messages

#### Connected
```json
{
  "type": "connected",
  "message": "Connected to Codera WebSocket server",
  "serverId": "backend-1"
}
```

#### Auth Success
```json
{ "type": "auth_success", "userId": "user-123", "serverId": "backend-1" }
```

#### Subscribed
```json
{ "type": "subscribed", "submissionId": "550e8400-..." }
```

#### Status Update (queued → running)
```json
{
  "type": "status_update",
  "submissionId": "550e8400-...",
  "status": "running"
}
```

#### Per-Testcase Result (live, as each completes)
```json
{
  "type": "test_result",
  "submissionId": "550e8400-...",
  "testcaseIndex": 1,
  "verdict": "AC",
  "time": "0.012",
  "memory": "3456"
}
```

#### Final Verdict (after all testcases)
```json
{
  "type": "final_verdict",
  "submissionId": "550e8400-...",
  "verdict": "AC",
  "passedTests": 3,
  "totalTests": 3,
  "results": [
    { "testcaseIndex": 1, "status": "AC", "time": "0.012", "memory": "3456" },
    { "testcaseIndex": 2, "status": "AC", "time": "0.015", "memory": "3600" },
    { "testcaseIndex": 3, "status": "AC", "time": "0.010", "memory": "3200" }
  ]
}
```

#### Pong
```json
{ "type": "pong", "timestamp": 1708243200000 }
```

#### Error
```json
{ "type": "error", "message": "Authenticate first" }
```

---

## Verdict Values

| Verdict          | Meaning                         |
|------------------|---------------------------------|
| `AC`             | Accepted                       |
| `WA`             | Wrong Answer                   |
| `TLE`            | Time Limit Exceeded            |
| `MLE`            | Memory Limit Exceeded          |
| `RTE`            | Runtime Error                  |
| `CE`             | Compilation Error              |
| `INTERNAL_ERROR` | Internal judge error           |
| `PENDING`        | Not yet evaluated              |

## Submission Status Values

| Status    | Meaning                        |
|-----------|--------------------------------|
| `queued`  | In BullMQ queue, waiting       |
| `running` | Testcases being judged         |
| `finished`| All testcases complete         |

---

## Typical Frontend Flow

```
1. User writes code in Monaco editor
2. POST /submissions → get submissionId
3. Connect WebSocket (if not already)
4. Send auth message
5. Send subscribe_submission with submissionId
6. Show "Running..." animation
7. Receive test_result events → update per-test indicators
8. Receive final_verdict → show final result with animation
9. If user refreshes: GET /submissions/:id (fallback)
```
