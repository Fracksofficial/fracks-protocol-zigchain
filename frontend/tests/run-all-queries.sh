#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

bash "$script_dir/factory-queries.sh"
bash "$script_dir/token-queries.sh"
bash "$script_dir/identity-registry-queries.sh"
bash "$script_dir/trusted-issuers-queries.sh"
bash "$script_dir/claim-topics-queries.sh"
bash "$script_dir/compliance-queries.sh"
bash "$script_dir/onchainid-queries.sh"

echo "All queries complete. Output saved under $script_dir/output."
