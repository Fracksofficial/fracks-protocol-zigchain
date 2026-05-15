# User Flow Guide

This document describes the expected flow for each user type in the platform.
It is meant to align with the current frontend and contract-driven permissions.

## Platform Owner

Primary responsibilities:
- Set up platform-level trust (TIR owner).
- Configure compliance and governance policies.
- Oversee asset/token lifecycle at a platform level.

Flow:
1) Connect wallet with the platform owner address.
2) Go to `Personnel` to manage Trusted Issuers (KYC providers).
3) Go to `Compliance` to set allowed countries and transfer limits.
4) Use `Issuance` to create token contracts (factory admin only).
5) Use `Token Admin` for token-specific admin actions if also token owner/agent.
6) Review `Activity Logs` for audit trails.

Expected pages:
- `/personnel` (Trusted issuers management)
- `/compliance` (rules and limits)
- `/issuance` (factory asset creation)
- `/token-admin` (token-level admin when applicable)
- `/activity-logs` (audit trails)

## Token Owner

Primary responsibilities:
- Create the token asset entry inside a token contract.
- Manage agents, pause/unpause, freeze/unfreeze addresses.

Flow:
1) Connect wallet that is the token owner.
2) Go to `Token Admin` and select the token contract.
3) If the token has no asset entry, create the token asset entry.
4) Add or remove agents as needed.
5) Freeze/unfreeze addresses when required.
6) Pause/unpause token transfers during incidents.

Expected pages:
- `/token-admin` (token-level admin actions)
- `/personnel` (agent + freeze actions, token-specific)

## Token Issuer

Primary responsibilities:
- Request issuance approvals.
- Issue tokens after controller approval.

Flow:
1) Connect issuer wallet.
2) Go to `Token Admin` and select a token contract.
3) Open `Issuance & Redemption` panel.
4) Submit an issuance request (asset ID, recipient, amount).
5) After controller approval, select the approved request and issue tokens.

Expected pages:
- `/token-admin` (issuance workflow)

## Token Controller

Primary responsibilities:
- Approve/reject issuance requests.
- Approve redemption requests.

Flow:
1) Connect controller wallet.
2) Go to `Token Admin` and select a token contract.
3) Review pending issuance approvals; approve or reject.
4) Review redemption requests; approve as needed.

Expected pages:
- `/token-admin` (approvals)

## KYC Provider

Primary responsibilities:
- Create OnchainID for investors.
- Add identity claims (KYC/AML).
- Batch KYC updates.

Flow:
1) Connect KYC provider wallet.
2) Go to `KYC Provider`.
3) Create OnchainID for an investor wallet.
4) Add claims (KYC/AML/accreditation).
5) Batch update KYC statuses if needed.

Expected pages:
- `/kyc-provider`
- `/identity` (identity and claims view)

## Investor

Primary responsibilities:
- Complete KYC.
- Hold and transfer tokens.
- Request redemptions.

Flow:
1) Connect investor wallet.
2) Go to `Identity` to submit KYC (if not verified).
3) Once verified, browse assets in `Explore Assets`.
4) Use token transfers where permitted.
5) Request redemption in `Token Admin` if holding tokens.

Expected pages:
- `/identity` (KYC + claims)
- `/assets` and `/assets/[id]` (asset discovery)
- `/token-admin` (redemption request)

## Admin (Backend Role)

Primary responsibilities:
- Off-chain operations (backend).
- Audits and approvals when delegated by governance.

Flow:
1) Log in to backend and access admin-protected endpoints.
2) Review audit logs and operational data.
3) Coordinate with platform owner for on-chain actions.

Expected pages:
- `/activity-logs` (read-only visibility)

---

Notes:
- On-chain permissions always apply even if UI controls are visible.
- Token-specific actions require selecting the token contract context.
- Trusted Issuers are global; agents and freezes are token-specific.
