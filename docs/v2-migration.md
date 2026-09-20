# Return to OpenCode V2

Restored for OpenCode 2.0.11 after the V1 rollback in `0b138d4`.

- `opencode.json` uses native V2 `update`, `providers`, `plugins`, `agents`, `commands`, `permissions`, and `mcp.servers` fields. Automatic updates, manual sharing, allow-all permissions, and both MCP servers retain their existing behavior.
- `cli.json` is the active terminal configuration. The custom `github-dark-colorblind` theme is migrated to V2 and selected in dark mode. Other local preferences remain: hidden sidebar and scrollbar, visible thinking, disabled terminal titles, and attention sounds at volume 0.4.
- Restored V2 horizontal tabs scoped to the working directory, `Ctrl+H`/`Ctrl+L` tab navigation, numbered tab selection, open-menu, and `Ctrl+Enter` prompt queuing. The leader remains `Ctrl+Space`.
- Plugins live under `plugins/<id>/index.ts` and `tui.tsx`, using `@opencode/plugin` and `@opencode/client` 2.0.11. The old V1 `tui.json` and `tui-plugins/` entrypoints are removed; Git retains the rollback configuration.
- The custom history-search plugin and its CLI registration are removed.
- Session metrics use V2 message content and the `prompt.footer.status` slot. Synthetic messages are excluded from user turns, and overlapping tool intervals are counted once. Timings remain estimates from stored timestamps.
- `/commit-message` uses V2's `subagent` frontmatter.
- The OCX manifest, registry build script, and Pages publishing workflow are removed. GitHub Releases use changelog entries without a registry version check.

Start the installed V2 `opencode` normally. V2 uses its managed service; the old V1 `OPENCODE_DB=...opencode-v1.db` launch instructions are historical. CLI settings reload live; reopen the terminal client to load the restored plugin entrypoints.
