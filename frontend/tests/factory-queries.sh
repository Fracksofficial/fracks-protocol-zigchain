#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$script_dir/query-utils.sh"

factory_contract="${NEXT_PUBLIC_TREX_FACTORY:-zig14f2w4p9gdgkdh66qg55cs6mlf0ya9grl7uytnc4aw8wz8keh6g9q6sxd7k}"
asset_id="${ASSET_ID:-1}"

# Optional: first token contract for asset_id_by_contract
default_token_contract="${NEXT_PUBLIC_TREX_TOKEN:-zig1stejrmcpjw8y707cdeqa9t4yta0asrzy4ahu8v4fe9uv843rywss56sw6h}"

query_contract "$factory_contract" "factory" "config" '{"config":{}}'
query_contract "$factory_contract" "factory" "all_tokens_default" '{"all_tokens":{}}'
query_contract "$factory_contract" "factory" "all_tokens_page" '{"all_tokens":{"start_after":0,"limit":100}}'
query_contract "$factory_contract" "factory" "token_by_asset_id" "{\"token\":{\"asset_id\":$asset_id}}"
query_contract "$factory_contract" "factory" "asset_id_by_contract" "{\"asset_id_by_contract\":{\"contract\":\"$default_token_contract\"}}"
