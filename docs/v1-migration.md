# Return to OpenCode V1

Based on the latest fetched `origin/main` commit `896697c`, including the September 2026 changes. The V1 release tag was not used as the final baseline, so the GitHub MCP addition and subsequent removals remain intact.

- Runtime config uses singular V1 `provider`, `plugin`, `agent`, `command`, `permission`, and flat `mcp` keys.
- `tui.json` replaces V2 `cli.json`; 158 supported keybindings retain their latest assignments. The leader remains `Ctrl+Space`. Enter is left enabled for normal prompt submission.
- The current local theme override (`github`) is carried forward. `github-dark-colorblind` remains available through the theme picker.
- History search uses the V1 dialog and prompt APIs, retains bounded search rendering and incremental caching, and selects the database through `OPENCODE_DB`. Cache filenames are separated by database path.
- Session metrics read V1 message/part state and render in `session_prompt_right`. Overlapping tool durations are counted once. Historical synthetic migration notes are not counted as user turns. Timing is an estimate based on stored message/tool timestamps.
- Global custom skills and title-notification plugins remain removed. The OCX registry now builds only the command and current MCP bundle; deleted skills are no longer referenced.

V2-only settings are not emitted into V1 configuration: tabs (selection, close/reopen, unread navigation, layout/scope), open-menu, queued-prompt deletion/queue submission, previous/next user-message navigation, project-copy generation, rich prompt-editor enablement, and V2 session display defaults. V1's own persisted UI preferences continue to apply. The existing local `cli.json` was backed up outside the submodule before checkout.

`service.json` remains ignored. No provider credentials, service password, database, or history cache belongs in this repository. The SDK installed locally for plugin development is `@opencode-ai/plugin@1.18.30`; dependency files remain ignored under the repository's existing policy.

Validation: both V1 JSON schemas pass; both plugins pass TypeScript checking; the OCX build validates and produces three components. An offline V1 TUI test confirmed the Ctrl+R history dialog and active session-metrics rendering. Remote MCP authentication was not exercised in this test.
