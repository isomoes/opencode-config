# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Remove the custom history-search plugin and OCX registry build/publishing setup; simplify releases to use the changelog.
- Migrate `github-dark-colorblind` to the V2 theme format and activate it in dark mode, preserving its blue/orange palette.
- Restore native V2 configuration, session-tab keybindings, and the V2 session-metrics plugin for OpenCode 2.0.11 while preserving current local preferences.
- Restore V1 configuration and TUI plugin APIs while retaining current MCP servers, keybindings, history search, and session metrics.
- Isolate prompt-history caches by database and remove deleted skills from the OCX bundle.

## [0.1.0] - 2026-07-24

- Distribution: Added the `isomoes/opencode` OCX bundle, release automation, and GitHub Pages publishing workflow. (@isomoes) 0318ac9
- Documentation: Corrected the release repository and Pages registry endpoint to `isomoes/opencode-config`. (@isomoes) 4e6bb63
