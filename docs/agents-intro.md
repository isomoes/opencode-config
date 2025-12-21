---
title: "Agents: Your AI Team of Specialists"
description: A deep dive into OpenCode's agent system and how to orchestrate your AI workforce
date: 2025-12-21
author: OpenCode Team
tags: [agents, orchestration, productivity]
---

# Agents: Your AI Team of Specialists

Imagine you're running a software company, but instead of hiring humans, you're assembling a team of AI specialists. Some are architects who plan everything but never touch the code. Others are builders who write code all day. Some are reviewers who catch your mistakes. And a few are explorers who can navigate any codebase like it's their hometown.

This isn't science fiction—it's what OpenCode's agent system delivers.

## The Two Types of Agents

OpenCode operates with two distinct agent types that work together like a well-oiled machine:

### Primary Agents: Your Main Collaborators

These are the agents you interact with directly. Think of them as your primary development partners. You can switch between them with a single press of the **Tab** key—no context switching, no restarting, just instant role changes.

**Build** is your default workhorse. It has full access to everything: file operations, bash commands, editing capabilities. When you need to get things done, Build is there, ready to write, edit, and execute. This is the agent that actually builds your software.

**Plan** is your strategic advisor. It can see everything, analyze everything, but it *can't change anything*. By default, Plan has:
- **Edit**: Denied (no file modifications)
- **Bash**: Restricted to read-only commands like `git diff`, `git log`, `ls`, `grep`, `cat`, `head`, `tail`, etc. Any destructive command or write operation requires explicit permission
- **Webfetch**: Allowed (can research online)

This is your safety net for exploring unfamiliar codebases or getting a second opinion before making changes. It's like having a senior architect review your work without ever touching the keyboard.

### Subagents: Your Specialized Task Force

Subagents are the specialists you call in for specific jobs. You can invoke them with `@mentions` in your messages, or they can be automatically summoned by primary agents when needed.

**General** is your research powerhouse. This general-purpose subagent handles complex questions, searches for code, and executes multi-step tasks. It has full tool access (except todo tools) and can work in parallel on multiple units of work. Use it when searching for keywords or files and you're not confident you'll find the right match in the first few tries. It's your deep-diving investigator.

**Explore** is your fast navigator. This specialized subagent is optimized for quick codebase exploration with a focused toolset:
- **Enabled**: `grep`, `glob`, `list`, `read`, `bash` (read-only)
- **Disabled**: `write`, `edit`, `todowrite`, `todoread`

Its system prompt explicitly instructs it to be a "file search specialist" that excels at navigating codebases using glob patterns, regex searches, and file reading. It returns absolute paths and avoids emojis. It's your rapid reconnaissance agent.

## The Magic of Orchestration

What makes OpenCode's agent system truly powerful isn't just the individual agents—it's how they work together.

**Switching Primary Agents**: Press **Tab** to cycle between Build and Plan during a session. No restarting, no context loss—just instant role changes.

**Invoking Subagents**: You have two ways to call in specialists:

1. **Automatic**: Primary agents can automatically invoke subagents based on their descriptions. Build might call Explore to find files, then General to research patterns.

2. **Manual**: Use `@mentions` in your messages:
   ```
   @general help me understand how authentication works in this codebase
   ```
   
   Then take those insights to Build:
   ```
   Now let's add JWT support to the auth system
   ```

**Session Navigation**: When subagents create child sessions, navigate with your leader key:
- **Leader+Right**: Cycle forward (parent → child1 → child2 → ... → parent)
- **Leader+Left**: Cycle backward (parent ← child1 ← child2 ← ... ← parent)

This lets you seamlessly switch between the main conversation and specialized subagent work.

## Custom Agents: Your Personal Workforce

The real power comes when you start creating your own agents. OpenCode lets you define agents in two ways:

### JSON Configuration

```json
{
  "agent": {
    "security-auditor": {
      "description": "Identifies security vulnerabilities",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-5",
      "tools": {
        "write": false,
        "edit": false
      },
      "temperature": 0.1,
      "prompt": "You are a security expert. Look for: input validation issues, authentication flaws, data exposure risks, dependency vulnerabilities. Provide actionable recommendations."
    }
  }
}
```

### Markdown Files

Create a file `~/.config/opencode/agent/security-auditor.md`:

```markdown
---
description: Identifies security vulnerabilities
mode: subagent
tools:
  write: false
  edit: false
temperature: 0.1
---

You are a security expert. Look for:
- Input validation issues
- Authentication flaws
- Data exposure risks
- Dependency vulnerabilities

Provide actionable recommendations with code examples.
```

The markdown approach is beautifully simple—just write what the agent should do, and OpenCode handles the rest.

### Built-in Specialized Agents

OpenCode also includes hidden built-in agents for specific tasks:

- **Title Generator**: Creates concise conversation titles (≤50 chars, no explanations)
- **Summary Generator**: Condenses conversations to 2 sentences max
- **Compaction Agent**: Provides detailed summaries focusing on what was done, current work, modified files, and next steps
- **Agent Generator**: Uses the `opencode agent create` command to interactively build new agents based on your requirements

## Real-World Agent Examples

Here are some agents that teams are actually using:

**The Code Reviewer**: A subagent that never writes code, only reviews it. It has access to read files and grep, but write and edit are disabled. It focuses on best practices, potential bugs, and maintainability.

**The Test Writer**: A primary agent configured to write tests with a lower temperature for more deterministic output. It has full bash access to run tests and verify its work.

**The Documentation Specialist**: An agent that can write and edit files but can't run shell commands. Perfect for maintaining docs without risk of accidental system changes.

**The Git Guardian**: An agent with permission to run `git status`, `git log`, and `git diff`, but requires approval for `git push` or any destructive git operations.

**The Bug Hunter**: A subagent optimized for debugging with read access, grep, and selective bash commands (stack traces, log reading) but no write capabilities.

## The Permission System: Safety Meets Autonomy

OpenCode's permission system is granular and powerful. Here's how it actually works:

**Build Agent (Default)**:
- `edit`: "allow" - Can modify any file
- `bash`: `{"*": "allow"}` - Can run any command
- `webfetch`: "allow" - Can fetch web content
- `doom_loop`: "ask" - Protection against infinite loops
- `external_directory`: "ask" - Access outside project root

**Plan Agent (Restricted)**:
- `edit`: "deny" - Cannot modify files
- `bash`: Whitelist of read-only commands (git diff/log/status, ls, grep, cat, head, tail, etc.)
- `webfetch`: "allow" - Can research online
- Any command not in the whitelist requires "ask" permission

**Custom Permissions**:
```json
{
  "agent": {
    "build": {
      "permission": {
        "bash": {
          "git push": "ask",
          "rm -rf *": "deny",
          "*": "allow"
        }
      }
    }
  }
}
```

You can also set permissions for specific bash commands using glob patterns:
```json
{
  "permission": {
    "bash": {
      "git status": "allow",
      "git log*": "allow",
      "git *": "ask",  // All other git commands need approval
      "*": "allow"
    }
  }
}
```

This means your build agent can run most commands freely, but will ask before pushing to remote, and will outright refuse to run dangerous commands.

## Temperature: The Creativity Dial

Every agent has a temperature setting that controls its creativity:

- **0.0-0.2**: Laser-focused, perfect for code analysis, security reviews, and planning
- **0.3**: Balanced, great for general development work (default for most models)
- **0.55**: Used by Qwen models as their default
- **0.7+**: Creative, ideal for brainstorming and exploration

If no temperature is specified, OpenCode uses model-specific defaults. The agent generator uses 0.3 for creating new agents.

## Why Agents Change Everything

Traditional AI coding assistants are like having a really smart pair programmer. OpenCode's agents are like having an entire development team at your disposal.

**Built-in Intelligence**: The system comes with carefully crafted prompts for each agent:
- **Explore** has a specialized prompt focused on file searching with glob patterns and regex
- **Title Generator** follows strict rules (≤50 chars, no explanations, use -ing verbs)
- **Compaction** provides comprehensive summaries of what was done, current state, and next steps

**Orchestration**: Need to quickly understand a new codebase? Call Explore. Want to review a pull request? Invoke your Reviewer agent. Need to implement a complex feature? Build orchestrates the specialists automatically. Just want to plan and think? Switch to Plan mode and explore safely.

**Safety & Control**: The permission system ensures agents can't accidentally destroy your work. Plan mode is read-only by design. Build mode has guardrails against dangerous operations.

**Customization**: Every aspect is configurable—tools, permissions, models, prompts, temperature. You can create agents for any workflow: security auditors, test writers, documentation specialists, deployment assistants.

The agent system transforms OpenCode from a single AI assistant into a flexible, powerful platform for orchestrating AI labor. It's the difference between having a calculator and having a mathematician, a physicist, and an engineer all working together.

---

*Ready to build your AI team? Start with the built-in agents (`Tab` to switch between Build and Plan), then customize as you discover your workflow needs.*