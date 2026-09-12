#!/usr/bin/env bash
# Stage this global OpenCode config in OCX's canonical source layout and build it.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
out_dir="${1:-$repo_root/dist}"

staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT

cp "$repo_root/registry.jsonc" "$staging/"
mkdir -p "$staging/files/commands"
cp "$repo_root/commands/commit-message.md" "$staging/files/commands/"

bunx ocx build "$staging" --out "$out_dir" --show-validation

echo "Registry built to $out_dir"
