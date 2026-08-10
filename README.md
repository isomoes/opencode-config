# OpenCode Configuration

Personal global configuration for [OpenCode](https://opencode.ai), a terminal-based AI coding agent. Lives at `~/.config/opencode/`.

## Install via OCX

The reusable command, skills, and Context7 MCP server are published as
the `isomoes/opencode` [OCX](https://ocx.kdco.dev) bundle:

```bash
ocx registry add https://isomoes.github.io/opencode-config --name isomoes --global
ocx add isomoes/opencode --global
```

For a project-local install, omit `--global` and run `ocx init` first. An
ephemeral install without saving the registry is also supported:

```bash
ocx add isomoes/opencode --from https://isomoes.github.io/opencode-config --global
```

Set `C7_KEY` for authenticated Context7 access. Personal permissions, sharing
policy, TUI keybindings, TUI plugins, and themes are intentionally not changed
by the bundle.

To build the static registry locally (requires Bun):

```bash
./scripts/build-registry.sh
```

Releases are prepared with [`prompt/release.md`](./prompt/release.md). Pushing
a version tag such as `v1.0.0` creates the GitHub Release; a successful release
then triggers publication of the OCX registry to GitHub Pages.

## Layout

| Path           | Purpose                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `opencode.json`| Core config: providers, plugins, MCP servers, permissions                |
| `cli.json`     | CLI/TUI config: theme, keybindings, scroll                               |
| `commands/`    | Custom commands (`/commit-message`)                                      |
| `plugins/`     | Local plugin: `nvim-reload` (auto-reload files in Neovim)                |
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

## CLI/TUI (`cli.json`)

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

[Docs](https://opencode.ai/v2/docs) · [Config](https://opencode.ai/v2/docs/config) · [Providers](https://opencode.ai/v2/docs/providers) · [Agents](https://opencode.ai/v2/docs/agents) · [MCP](https://opencode.ai/v2/docs/mcp-servers) · [Permissions](https://opencode.ai/v2/docs/permissions)
