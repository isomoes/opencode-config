# OpenCode V2 Configuration

Global configuration for [OpenCode V2](https://opencode.ai/v2/docs/), targeting 2.0.11. This submodule lives at `~/.config/opencode/`.

## Configuration

| Path | Purpose |
| --- | --- |
| `opencode.json` | V2 providers, commands, permissions, and MCP servers |
| `cli.json` | Theme, keybindings, tabs, attention sounds, scrolling, and CLI plugins |
| `commands/` | `/commit-message` command |
| `plugins/session-metrics/` | Turns, assistant steps, and estimated LLM/tool time beside the session prompt |
| `themes/` | Custom themes, including `github-dark-colorblind` |

Automatic updates are enabled, sharing is manual, and permissions allow all actions. No custom providers or authentication plugins are configured.

MCP servers:

| Server | Authentication |
| --- | --- |
| Context7 | `C7_KEY` environment variable |
| GitHub | `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable |

Both use remote HTTP endpoints with OAuth disabled. Credentials are expanded from the environment and are not stored in the repository.

## Terminal UI

The theme is `github-dark-colorblind`, locked to dark mode, with blue additions and orange deletions. The leader is **Ctrl+Space**.

| Action | Binding |
| --- | --- |
| New session / session list | `<leader>n` / `<leader>l` |
| External editor / models / diffs | `<leader>e` / `<leader>m` / `<leader>d` |
| Toggle sidebar | `<leader>b` |
| Command palette / open menu | `Ctrl+P` / `Ctrl+O` |
| Previous / next session tab | `Ctrl+H` / `Ctrl+L` |
| Select tab | `<leader>1`…`0` or `Ctrl+1`…`0` |
| Close / reopen tab | `<leader>w` / `Ctrl+Shift+T` |
| Send / newline / queue prompt | `Enter` / `Shift+Enter` / `Ctrl+Enter` |

CLI settings reload live. Reopen the terminal client after changing plugin entrypoints. See [V2 migration notes](docs/v2-migration.md) for the return from the previous V1 setup.

## Releases

Pushing a `v*` tag creates a GitHub Release using the matching section of `CHANGELOG.md`. See [the release prompt](prompt/release.md) for the workflow.

[V2 config](https://opencode.ai/v2/docs/config) · [CLI settings](https://opencode.ai/v2/docs/cli/config) · [Keybinds](https://opencode.ai/v2/docs/cli/keybinds) · [MCP](https://opencode.ai/v2/docs/mcp-servers)
