#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$script_dir/query-utils.sh"

# Token contracts list
if [ -n "${NEXT_PUBLIC_TREX_TOKEN_LIST:-}" ]; then
  IFS=',' read -r -a token_contracts <<< "$NEXT_PUBLIC_TREX_TOKEN_LIST"
elif [ -n "${NEXT_PUBLIC_TREX_TOKEN:-}" ]; then
  token_contracts=("$NEXT_PUBLIC_TREX_TOKEN")
else
  token_contracts=(
    "zig1stejrmcpjw8y707cdeqa9t4yta0asrzy4ahu8v4fe9uv843rywss56sw6h"
    "zig1534ffnjjgdtthasgwgxtlhtjgvajrwr826tul5wqff4gkppd2lmqj248qj"
  )
fi

investor_addr="${ADDRESS_INVESTOR:-${NEXT_PUBLIC_INVESTOR:-zig1rtrnuyh5s3y367az3600sy4ujheyccq70vjps2}}"
spender_addr="${ADDRESS_PLATFORM_OWNER:-${NEXT_PUBLIC_PLATFORM_OWNER:-zig1rtrnuyh5s3y367az3600sy4ujheyccq70vjps2}}"
asset_id="${ASSET_ID:-1}"

for token in "${token_contracts[@]}"; do
  name="token_$(slugify "$token")"
  query_contract "$token" "$name" "token_info" '{"token_info":{}}'
  query_contract "$token" "$name" "roles" '{"roles":{}}'
  query_contract "$token" "$name" "agents" '{"agents":{}}'
  query_contract "$token" "$name" "paused" '{"paused":{}}'
  query_contract "$token" "$name" "balance" "{\"balance\":{\"address\":\"$investor_addr\"}}"
  query_contract "$token" "$name" "allowance" "{\"allowance\":{\"owner\":\"$investor_addr\",\"spender\":\"$spender_addr\"}}"
  query_contract "$token" "$name" "frozen" "{\"frozen\":{\"address\":\"$investor_addr\"}}"
  query_contract "$token" "$name" "redemption_requests" '{"redemption_requests":{}}'
  query_contract "$token" "$name" "issuance_requests" '{"issuance_requests":{}}'
  query_contract "$token" "$name" "asset_info" "{\"asset_info\":{\"asset_id\":$asset_id}}"
  echo ""
done
