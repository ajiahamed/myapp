#!/usr/bin/env bash
# Usage: list_tags.sh <registry> <repo> <user> <pass>
set -euo pipefail
reg="$1"; repo="$2"; user="$3"; pass="$4"

curl -fsSL -u "${user}:${pass}" \
     "https://${reg}/v2/${repo}/tags/list" |
     jq -r '.tags[]'      |   # extract tags
     sort -V              |   # natural sort (v1, v2 … v10)
     tac                      # newest at the top

echo "Done ..... /"
