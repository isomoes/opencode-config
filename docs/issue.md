# Issue

## Problem: Slow CLI Startup Due to Plugin Package Installation

Plugin package installation is very slow without a proxy, causing significantly long CLI startup times.

### Setup

Create an alias to use a proxy when starting opencode:

```bash
alias opencode-proxy='HTTPS_PROXY=http://localhost:1080 opencode'
```

### Debugging

To debug startup performance with proxy enabled, run:

```bash
HTTPS_PROXY=http://localhost:1080 opencode --log-level DEBUG --print-logs
```

Logs are located at `~/.local/share/opencode/log`.

```
INFO  2025-12-23T08:27:39 +0ms service=bun cmd=["~/.opencode/bin/opencode","add","--force","--exact","--cwd","~/.cache/opencode","opencode-skills@latest"] cwd=~/.cache/opencode running
INFO  2025-12-23T08:29:40 +121062ms service=bun code=0 stdout=bun add v1.3.5 (1e86cebd)

+ opencode-anthropic-auth@0.0.5
+ opencode-copilot-auth@0.0.9

installed opencode-skills@1.0.0

29 packages installed [121.06s]
 stderr=Resolving dependencies
Resolved, downloaded and extracted [1]
```
