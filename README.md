# OpenCode Configuration

Personal global configuration for [OpenCode](https://opencode.ai), a terminal-based AI coding agent. Lives at `~/.config/opencode/`.

## Layout

| Path           | Purpose                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `opencode.json`| Core config: providers, plugins, MCP servers, permissions                |
| `tui.json`     | TUI config: theme, keybindings, scroll, TUI plugins                      |
| `agent/`       | Custom agents (`explore`)                                                |
| `command/`     | Custom commands (`/commit-message`)                                      |
| `plugins/`     | Local plugins: `dunstify` (desktop notifications), `nvim-reload` (auto-reload files in Neovim), `terminal-title` |
| `tui-plugins/` | TUI plugins: `history-search`                                            |
| `themes/`      | Custom themes (`github-dark-colorblind`)                                 |
| `skills/`      | Skills: `superpowers` collection (TDD, debugging, planning, ...), `find-skills` |

## Core Config (`opencode.json`)

| Setting      | Value                                             |
| ------------ | ------------------------------------------------- |
| Autoupdate   | Enabled                                           |
| Share        | Manual                                            |
| Permission   | Allow all                                         |
| Plugins      | `opencode-claude-auth@latest`                     |

### Providers

| Provider | Base URL                       | API Key Env         |
| -------- | ------------------------------ | ------------------- |
| OpenAI   | `http://xsec.fun:7015/v1`      | `CLIPROXY_API_KEY`  |
| Google   | `https://aiapi.isomoes.site/v1`| `AIAPI_AUTH_KEY`    |

### MCP Servers

| Server       | Type   | Details                                        |
| ------------ | ------ | ---------------------------------------------- |
| `context7`   | Remote | `https://mcp.context7.com/mcp` (key: `C7_KEY`) |
| `ddg-search` | Local  | `uvx duckduckgo-mcp-server`                    |

## TUI (`tui.json`)

Theme: `github-dark-colorblind` · Scroll speed: 3 (acceleration on) · Leader key: `Ctrl+X`

| Category | Keybindings                                                                 |
| -------- | ---------------------------------------------------------------------------- |
| App      | `<leader>q` exit · `<leader>e` editor · `<leader>t` themes · `<leader>b` sidebar · `<leader>s` status |
| Session  | `<leader>n` new · `<leader>l` list · `<leader>g` timeline · `<leader>x` export · `<leader>c` compact · `<leader>+←/→` cycle children |
| Messages | `PgUp/PgDn` page · `Ctrl+U/D` half page · `<leader>y` copy · `<leader>u/r` undo/redo · `<leader>h` conceal · `<leader>d` diff |
| Models   | `<leader>m` list · `F2`/`Shift+F2` cycle recent                              |
| Agents   | `<leader>a` list · `Tab`/`Shift+Tab` cycle                                   |
| Input    | `Enter` submit · `Shift+Enter` newline · `↑/↓` history · `Ctrl+P` commands   |

## Config Loading

OpenCode merges config from (later overrides earlier):

1. Global: `~/.config/opencode/opencode.json`
2. Project: `./opencode.json` (walks up to worktree root)
3. `OPENCODE_CONFIG=/path/to/config.json`

Note: config is loaded once at startup — restart OpenCode after changes.

## Documentation

[Docs](https://opencode.ai/docs) · [Config](https://opencode.ai/docs/config) · [Providers](https://opencode.ai/docs/providers) · [Agents](https://opencode.ai/docs/agents) · [MCP](https://opencode.ai/docs/mcp-servers) · [Tools](https://opencode.ai/docs/tools)
