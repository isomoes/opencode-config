#!/usr/bin/env bash
# Stage this global OpenCode config in OCX's canonical source layout and build it.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
out_dir="${1:-$repo_root/dist}"

staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT

cp "$repo_root/registry.jsonc" "$staging/"
mkdir -p "$staging/files/commands" "$staging/files/plugins" "$staging/files/skills"
cp "$repo_root/command/commit-message.md" "$staging/files/commands/"
cp "$repo_root/plugins/terminal-title.ts" "$staging/files/plugins/"
cp -R "$repo_root/.agents/skills/find-skills" "$staging/files/skills/find-skills"
cp -R "$repo_root/skills/superpowers" "$staging/files/skills/superpowers"

bunx ocx build "$staging" --out "$out_dir" --show-validation

echo "Registry built to $out_dir"
