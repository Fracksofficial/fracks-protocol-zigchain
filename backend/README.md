# RWA Platform Backend

Minimal NestJS backend for authentication, authorization, and core platform APIs.

## Prerequisites
- Node.js 18+
- Postgres (database: `rwaPlatformDB`)

## Setup
1) Copy env file:
```
cp .env.example .env
```

2) Install dependencies:
```
pnpm install
```

3) Generate Prisma client and migrate:
```
pnpm prisma:generate
pnpm prisma:migrate
```

4) Run the API:
```
pnpm start:dev
```

## Indexer
Run a sync loop (default 30s interval):
```
pnpm indexer:dev
```

This indexes factory tokens, token roles, token assets, redemption requests, and
balances for wallet addresses stored in the Users table.

## Auth Endpoints
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

## Core Endpoints (DB-backed, for testing)
- `GET /assets`
- `POST /assets`
- `GET /issuance-requests`
- `POST /issuance-requests`
- `GET /redemption-requests`
- `POST /redemption-requests`
- `GET /compliance-rules`
- `POST /compliance-rules`

## Indexed Endpoints (read-only)
- `GET /indexed/state`
- `GET /indexed/assets`
- `GET /indexed/tokens`
- `GET /indexed/tokens/:contract`
- `GET /indexed/tokens/:contract/assets`
- `GET /indexed/tokens/:contract/balances`
- `GET /indexed/tokens/:contract/issuance-requests`
- `GET /indexed/tokens/:contract/redemption-requests`

## Notes
- All endpoints require JWT unless marked public.
- Roles are stored on the user record as a string array.

## Postman Guide

This guide walks through testing the API with Postman. Base URL defaults to
`http://localhost:4000` (from `src/main.ts`).

### Postman Setup
Create environment variables:
- `base_url`: `http://localhost:4000`
- `access_token`: (set after login/register)
- `refresh_token`: (set after login/register)

Add a collection-level Authorization:
- Type: `Bearer Token`
- Token: `{{access_token}}`

For public endpoints (`/auth/register`, `/auth/login`, `/auth/refresh`), you can override auth to `No Auth`.

### Auth Flow

1) Register
```
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "email": "user1@example.com",
  "password": "Password123!",
  "walletAddress": "zig1examplewallet",
  "requestedRole": "token_issuer"
}
```
Response: `{ "accessToken": "...", "refreshToken": "..." }`

Set Postman variables from response:
- `access_token` = `accessToken`
- `refresh_token` = `refreshToken`

2) Login
```
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "user1@example.com",
  "password": "Password123!"
}
```

3) Refresh
```
POST {{base_url}}/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{{refresh_token}}"
}
```

4) Me
```
GET {{base_url}}/auth/me
```

### Role Notes
Most endpoints are role-gated via JWT. New users are created with role
`investor` and `roleStatus: "PENDING"`. Admin-only or role-specific endpoints
will return 403 unless the JWT includes the required role.

Roles:
- `platform_owner`
- `token_owner`
- `token_issuer`
- `token_controller`
- `compliance_owner`
- `kyc_provider`
- `investor`
- `admin`

If you need to test admin-only endpoints, update the user roles in the DB
directly.

### Core Endpoints (DB-backed)

#### Assets
- `GET {{base_url}}/assets` (JWT required)
- `POST {{base_url}}/assets` (Roles: `platform_owner`, `admin`)

Create Asset:
```
POST {{base_url}}/assets
Content-Type: application/json

{
  "factoryAssetId": 1,
  "tokenContract": "0xTokenAddress",
  "name": "Example Asset",
  "symbol": "EXA",
  "referenceId": "REF-001",
  "description": "Example description",
  "issuerWallet": "zig1issuer",
  "legalOwner": "Example Owner",
  "deployedAt": "2026-02-26T00:00:00.000Z"
}
```

#### Issuance Requests
- `GET {{base_url}}/issuance-requests?tokenContract=0xToken&status=pending`
- `POST {{base_url}}/issuance-requests` (Roles: `token_issuer`, `admin`)
- `PATCH {{base_url}}/issuance-requests/:id/status` (Roles: `token_controller`, `admin`)
- `PATCH {{base_url}}/issuance-requests/:id/mint` (Roles: `token_issuer`, `admin`)

Create Issuance Request:
```
POST {{base_url}}/issuance-requests
Content-Type: application/json

{
  "requestId": 1001,
  "tokenContract": "0xTokenAddress",
  "assetId": 1,
  "recipient": "zig1recipient",
  "requester": "zig1requester",
  "amount": "1000"
}
```

Update Issuance Status:
```
PATCH {{base_url}}/issuance-requests/1/status
Content-Type: application/json

{
  "status": "approved",
  "txHash": "0xabc123"
}
```

Mark Minted:
```
PATCH {{base_url}}/issuance-requests/1/mint
Content-Type: application/json

{
  "txHash": "0xabc123"
}
```

#### Redemption Requests
- `GET {{base_url}}/redemption-requests`
- `POST {{base_url}}/redemption-requests` (Roles: `investor`, `admin`)
- `PATCH {{base_url}}/redemption-requests/:id/status` (Roles: `token_controller`, `admin`)

Create Redemption Request:
```
POST {{base_url}}/redemption-requests
Content-Type: application/json

{
  "requestId": 2001,
  "tokenContract": "0xTokenAddress",
  "assetId": 1,
  "requester": "zig1requester",
  "amount": "500",
  "reason": "Investor redemption"
}
```

Update Redemption Status:
```
PATCH {{base_url}}/redemption-requests/1/status
Content-Type: application/json

{
  "status": "approved",
  "txHash": "0xdef456"
}
```

#### Compliance Rules
- `GET {{base_url}}/compliance-rules`
- `POST {{base_url}}/compliance-rules/countries` (Roles: `compliance_owner`, `admin`)
- `GET {{base_url}}/compliance-rules/transfer-limits`
- `POST {{base_url}}/compliance-rules/transfer-limits` (Roles: `compliance_owner`, `admin`)
- `POST {{base_url}}/compliance-rules/simulate`

Set Allowed Countries:
```
POST {{base_url}}/compliance-rules/countries
Content-Type: application/json

{
  "allowedCountries": ["US", "CA"],
  "reason": "Initial allowlist",
  "txHash": "0x123"
}
```

Set Transfer Limit:
```
POST {{base_url}}/compliance-rules/transfer-limits
Content-Type: application/json

{
  "address": "zig1wallet",
  "limit": "1000",
  "reason": "Risk limit",
  "txHash": "0x456"
}
```

Simulate Transfer:
```
POST {{base_url}}/compliance-rules/simulate
Content-Type: application/json

{
  "from": "zig1from",
  "to": "zig1to",
  "amount": "100",
  "assetId": "1"
}
```

#### Identity Snapshots
- `GET {{base_url}}/identity-snapshots?wallet=zig1wallet` (Roles: `admin`, `platform_owner`)
- `POST {{base_url}}/identity-snapshots` (Roles: `kyc_provider`, `admin`)

Create Identity Snapshot:
```
POST {{base_url}}/identity-snapshots
Content-Type: application/json

{
  "wallet": "zig1wallet",
  "claimTopics": ["KYC", "AML"],
  "verified": true,
  "country": "US",
  "reason": "KYC verified",
  "txHash": "0x789"
}
```

#### Users (Admin Only)
- `GET {{base_url}}/users` (Roles: `admin`)
- `PATCH {{base_url}}/users/:id/roles` (Roles: `admin`)

Update User Roles:
```
PATCH {{base_url}}/users/USER_ID/roles
Content-Type: application/json

{
  "roles": ["admin", "platform_owner"],
  "roleStatus": "APPROVED"
}
```

#### Activity Logs
- `GET {{base_url}}/activity-logs?limit=50&offset=0` (Roles: `platform_owner`, `admin`)

### Indexed Endpoints (Read-only)
These endpoints do not use JWT guards in code.

- `GET {{base_url}}/indexed/state`
- `GET {{base_url}}/indexed/assets`
- `GET {{base_url}}/indexed/tokens`
- `GET {{base_url}}/indexed/tokens/:contract`
- `GET {{base_url}}/indexed/tokens/:contract/assets`
- `GET {{base_url}}/indexed/tokens/:contract/balances?wallet=zig1wallet`
- `GET {{base_url}}/indexed/tokens/:contract/issuance-requests`
- `GET {{base_url}}/indexed/tokens/:contract/redemption-requests`
- `GET {{base_url}}/indexed/wallets`
- `POST {{base_url}}/indexed/wallets`

Add Tracked Wallet:
```
POST {{base_url}}/indexed/wallets
Content-Type: application/json

{
  "walletAddress": "zig1wallet",
  "label": "Treasury"
}
```

### Note on Unwired Modules
There are additional controllers under `backend/src/modules/*` (KYC and token
issuance requests) that are not imported into `AppModule` and will not be
reachable unless those modules are added to `app.module.ts`.
