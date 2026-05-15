#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$script_dir/query-utils.sh"

compliance="${NEXT_PUBLIC_TREX_COMPLIANCE:-zig1zxwtghu2t98z7dryecjxmlqr75rus7sjzvcyz9hhlcs6vwdcn4nsx96gkg}"
from_addr="${ADDRESS_INVESTOR:-${NEXT_PUBLIC_INVESTOR:-zig1rtrnuyh5s3y367az3600sy4ujheyccq70vjps2}}"
to_addr="${ADDRESS_PLATFORM_OWNER:-${NEXT_PUBLIC_PLATFORM_OWNER:-zig1rtrnuyh5s3y367az3600sy4ujheyccq70vjps2}}"
amount="${TEST_AMOUNT:-1}"

# token used for compliance can_transfer
if [ -n "${NEXT_PUBLIC_TREX_TOKEN_LIST:-}" ]; then
  IFS=',' read -r -a token_contracts <<< "$NEXT_PUBLIC_TREX_TOKEN_LIST"
  token="${token_contracts[0]}"
elif [ -n "${NEXT_PUBLIC_TREX_TOKEN:-}" ]; then
  token="$NEXT_PUBLIC_TREX_TOKEN"
else
  token="zig1stejrmcpjw8y707cdeqa9t4yta0asrzy4ahu8v4fe9uv843rywss56sw6h"
fi

query_contract "$compliance" "compliance" "config" '{"config":{}}'
query_contract "$compliance" "compliance" "can_transfer" "{\"can_transfer\":{\"token\":\"$token\",\"from\":\"$from_addr\",\"to\":\"$to_addr\",\"amount\":\"$amount\"}}"
