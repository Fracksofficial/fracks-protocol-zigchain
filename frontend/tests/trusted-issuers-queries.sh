#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$script_dir/query-utils.sh"

trusted_issuers="${NEXT_PUBLIC_TREX_TIR:-zig1mk83hyfjq0nr2q3ej44j6zd8wwappr50zpa87s74r7mx7tu824cqfnsg5v}"
issuer="${ADDRESS_KYC_ISSUER:-${NEXT_PUBLIC_KYC_ISSUER:-zig1mfs7e8ut85g8fcxw4lr49d3404usljwxpk4nm2}}"

query_contract "$trusted_issuers" "trusted_issuers" "all_issuers" '{"all_issuers":{}}'
query_contract "$trusted_issuers" "trusted_issuers" "issuer_topics" "{\"issuer_topics\":{\"issuer\":\"$issuer\"}}"
query_contract "$trusted_issuers" "trusted_issuers" "is_issuer_for_topic" "{\"is_issuer_for_topic\":{\"issuer\":\"$issuer\",\"topic\":1}}"
