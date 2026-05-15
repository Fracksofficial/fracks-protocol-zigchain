#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
output_dir="${OUTPUT_DIR:-$script_dir/output}"
rest_endpoint="${NEXT_PUBLIC_ZIGCHAIN_REST:-https://public-zigchain-testnet-lcd.numia.xyz}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl not found. Please install curl." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found. Please install jq." >&2
  exit 1
fi

if ! command -v base64 >/dev/null 2>&1; then
  echo "base64 not found. Please install base64." >&2
  exit 1
fi

mkdir -p "$output_dir"

b64_encode() {
  printf '%s' "$1" | base64 | tr -d '\n'
}

slugify() {
  echo "$1" | tr ' /:' '___' | tr -cd 'A-Za-z0-9_\-'
}

query_contract() {
  local contract="$1"
  local contract_name="$2"
  local query_name="$3"
  local query_json="$4"

  local base64
  base64=$(b64_encode "$query_json")
  local url="$rest_endpoint/cosmwasm/wasm/v1/contract/$contract/smart/$base64"
  local response
  local curl_exit
  response=$(curl -s -w "\n%{http_code}" "$url" || true)
  curl_exit=$?
  local body
  body=$(printf "%s" "$response" | sed '$d')
  local status
  status=$(printf "%s" "$response" | tail -n 1)

  local safe_query
  safe_query=$(slugify "$query_name")
  local out_dir="$output_dir/$contract_name"
  mkdir -p "$out_dir"

  local response_json
  response_json="null"
  if [ -n "$body" ]; then
    if parsed=$(printf "%s" "$body" | jq -c . 2>/dev/null); then
      response_json="$parsed"
    fi
  fi

  jq -n \
    --arg contract "$contract" \
    --arg contract_name "$contract_name" \
    --arg query_name "$query_name" \
    --arg query_json "$query_json" \
    --arg query_base64 "$base64" \
    --arg url "$url" \
    --arg http_status "$status" \
    --arg raw_response "$body" \
    --arg curl_exit "$curl_exit" \
    --argjson response "$response_json" \
    '{contract: $contract, contract_name: $contract_name, query_name: $query_name, query_json: $query_json, query_base64: $query_base64, url: $url, http_status: $http_status, curl_exit: $curl_exit, raw_response: $raw_response, response: $response}' \
    | jq -S . > "$out_dir/$safe_query.json"

  echo "[$contract_name] $query_name"
  if [ -n "$body" ]; then
    echo "$body" | jq -S . 2>/dev/null || echo "$body"
  elif [ "$curl_exit" != "0" ]; then
    echo "Request failed (curl exit $curl_exit, HTTP $status)"
  else
    echo "Empty response (HTTP $status)"
  fi
  echo "----"
}
