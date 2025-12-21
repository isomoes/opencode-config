# OpenCode Configuration

This repository contains the configuration for [OpenCode](https://opencode.ai), an open source AI coding agent.

## Overview

OpenCode is a terminal-based AI coding assistant that provides intelligent code completion, analysis, and development workflows. This configuration is customized with specific providers, models, and keybindings.

## Current Configuration

### Model Configuration

- **Small Model**: `deepseek/deepseek-chat`
- \*\* Provider: MIMO:
  - Model: `mimo-v2-flash`
  - Context Limit: 262,144 tokens
  - Output Limit: 65,536 tokens

### Features

- **Auto-update**: Enabled
- **Share Mode**: Manual
- **Theme**: GitHub
- **TUI**:
  - Scroll speed: 3
  - Scroll acceleration: Enabled

### MCP Integration

- **all-in-mcp**: Enabled
  - Command: `pipx run all-in-mcp`
  - Environment:
    - `APAPER`: false
    - `GITHUB_REPO_MCP`: true

### Keybindings

#### Leader Key: `Ctrl+X`

**Application**

- `Ctrl+C, <leader>q` - Exit app
- `<leader>e` - Open editor
- `<leader>t` - Theme list
- `<leader>b` - Toggle sidebar
- `<leader>s` - Status view

**Sessions**

- `<leader>n` - New session
- `<leader>l` - Session list
- `<leader>g` - Session timeline
- `<leader>x` - Export session
- `<leader>c` - Compact session
- `<leader>+right` - Next child
- `<leader>+left` - Previous child

**Messages**

- `PageUp` - Page up
- `PageDown` - Page down
- `Ctrl+U` - Half page up
- `Ctrl+D` - Half page down
- `Ctrl+G, Home` - First message
- `Ctrl+Alt+G, End` - Last message
- `<leader>y` - Copy message
- `<leader>u` - Undo
- `<leader>r` - Redo
- `<leader>h` - Toggle conceal

**Models & Agents**

- `<leader>m` - Model list
- `F2` - Cycle model forward
- `Shift+F2` - Cycle model backward
- `<leader>a` - Agent list
- `Tab` - Cycle agent forward
- `Shift+Tab` - Cycle agent backward

**Input**

- `Ctrl+C` - Clear input
- `Ctrl+V` - Paste
- `Enter` - Submit
- `Shift+Enter, Ctrl+J` - New line
- `Up/Down` - History navigation

## Configuration Locations

OpenCode loads configuration from multiple locations (merged together):

1. **Global**: `~/.config/opencode/opencode.json`
2. **Project**: `./opencode.json` (in project root or nearest git directory)
3. **Custom path**: `OPENCODE_CONFIG=/path/to/config.json`
4. **Custom directory**: `OPENCODE_CONFIG_DIR=/path/to/config-dir`

## Next Steps

### Recommended Enhancements

1. **Add more providers** for model diversity:
   - OpenAI for GPT models
   - Anthropic for Claude models
   - OpenRouter for access to many models

2. **Create specialized agents**:
   - Code reviewer (read-only)
   - Test writer
   - Documentation writer
   - Bug fixer

3. **Add useful MCP servers**:
   - Context7 for documentation search
   - GitHub for repository management
   - Filesystem for file operations

4. **Configure permissions** for safety:
   - Set `bash` to `"ask"` for production environments
   - Use `"deny"` for sensitive operations

5. **Add custom commands**:
   - `/test` - Run test suite
   - `/lint` - Run linter
   - `/deploy` - Deploy command

6. **Set up instructions**:
   - Add CONTRIBUTING.md
   - Add coding standards
   - Add project-specific guidelines

## Documentation

For complete documentation:

- [Official Docs](https://opencode.ai/docs)
- [Config Reference](https://opencode.ai/docs/config)
- [Providers](https://opencode.ai/docs/providers)
- [Agents](https://opencode.ai/docs/agents)
- [MCP Servers](https://opencode.ai/docs/mcp-servers)
- [Tools](https://opencode.ai/docs/tools)
