# OpenCode V1 Configuration

Global configuration for OpenCode 1.x, tested with 1.18.30. This submodule lives at `~/.config/opencode/`.

## Configuration

| Path | Purpose |
| --- | --- |
| `opencode.json` | V1 providers, commands, permissions, and MCP servers |
| `tui.json` | Theme, V1 keybindings, attention sounds, scrolling, and TUI plugins |
| `commands/` | `/commit-message` command |
| `tui-plugins/history-search.ts` | Fast prompt history search with `Ctrl+R` |
| `tui-plugins/session-metrics.ts` | Turns, assistant steps, and estimated LLM/tool time beside the session prompt |
| `themes/` | Custom themes, including `github-dark-colorblind` |

Automatic updates are enabled, sharing is manual, and permissions allow all actions. No custom provider or authentication plugins are configured. Global custom skills and title-notification plugins remain removed.

MCP servers:

| Server | Authentication |
| --- | --- |
| Context7 | `C7_KEY` environment variable |
| GitHub | `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable |

Both use remote HTTP endpoints with OAuth disabled. Credentials are expanded from the environment and are not stored in the repository.

## Terminal UI

The leader is **Ctrl+Space**. Press the leader followed by `n` for a new session, `l` for the session list, `e` for the editor, `m` for models, `d` for diffs, or `b` for the sidebar. `Ctrl+P` opens the command palette. `Ctrl+R` searches prompt history and inserts the selection without sending it. `Enter` sends; `Shift+Enter` adds a newline.

The latest supported input, diff, navigation, and dialog bindings have been translated to V1 names in `tui.json`. V2 tab management and other unsupported bindings are omitted. Attention notifications and sounds retain their latest settings. See [V1 migration notes](docs/v1-migration.md).

History search honors `OPENCODE_DB` and keeps a separate cache per database. For a V2-to-V1 database conversion, launch V1 with the isolated database:

```bash
OPENCODE_DB="$HOME/.local/share/opencode/opencode-v1.db" \
OPENCODE_EXPERIMENTAL_WORKSPACES=true opencode
```

The local shell function configured during migration already selects this database. Restart OpenCode after changing configuration.

## OCX bundle

The registry contains the commit command and the Context7/GitHub MCP settings. Personal permissions, themes, keybindings, and local TUI plugins are not included in the bundle.

```bash
ocx registry add https://isomoes.github.io/opencode-config --name isomoes --global
ocx add isomoes/opencode --global
```

Build and validate the registry locally with Bun:

```bash
./scripts/build-registry.sh
```

Version-tag releases retain the existing GitHub Release and Pages workflows. Building locally does not publish the registry.

[OpenCode V1 docs](https://opencode.ai/docs) · [Config](https://opencode.ai/docs/config/) · [Keybinds](https://opencode.ai/docs/keybinds/) · [MCP](https://opencode.ai/docs/mcp-servers/)
