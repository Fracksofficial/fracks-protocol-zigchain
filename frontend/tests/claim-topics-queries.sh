#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$script_dir/query-utils.sh"

claim_topics="${NEXT_PUBLIC_TREX_CTR:-zig1t0ragkey8dxnzacmy2pd8w5255qg23v7t5g9f06d88ty79wgzd6spw7m60}"

query_contract "$claim_topics" "claim_topics" "required_topics" '{"required_topics":{}}'
query_contract "$claim_topics" "claim_topics" "owner" '{"owner":{}}'
