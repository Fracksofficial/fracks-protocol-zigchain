#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$script_dir/query-utils.sh"

identity_registry="${NEXT_PUBLIC_TREX_IR:-zig1vth88kets72vp8zwj28uqe4zkzthavcsnjg4ce407sw2mudkdcjqc2fh5m}"
wallet="${ADDRESS_INVESTOR:-${NEXT_PUBLIC_INVESTOR:-zig1rtrnuyh5s3y367az3600sy4ujheyccq70vjps2}}"

query_contract "$identity_registry" "identity_registry" "config" '{"config":{}}'
query_contract "$identity_registry" "identity_registry" "identity" "{\"identity\":{\"wallet\":\"$wallet\"}}"
query_contract "$identity_registry" "identity_registry" "is_verified" "{\"is_verified\":{\"wallet\":\"$wallet\"}}"
