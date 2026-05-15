#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$script_dir/query-utils.sh"

onchainid="${NEXT_PUBLIC_INVESTOR_IDENTITY:-zig1xdn3yevwn4txsfswjh2lnk8mu7srgaamgc8rd5nsq9gkvw3nxj9snhqhnd}"
issuer="${ADDRESS_KYC_ISSUER:-${NEXT_PUBLIC_KYC_ISSUER:-zig1mfs7e8ut85g8fcxw4lr49d3404usljwxpk4nm2}}"

query_contract "$onchainid" "onchainid" "config" '{"config":{}}'
query_contract "$onchainid" "onchainid" "get_claim" "{\"get_claim\":{\"topic\":1,\"issuer\":\"$issuer\"}}"
query_contract "$onchainid" "onchainid" "claims_by_topic" '{"claims_by_topic":{"topic":1}}'
query_contract "$onchainid" "onchainid" "has_valid_claim" "{\"has_valid_claim\":{\"topic\":1,\"issuer_whitelist\":[\"$issuer\"]}}"
