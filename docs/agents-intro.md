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

**Build** is your default workhorse. It has full access to everything: file operations, bash commands, editing capabilities. When you need to get things done, Build is there, ready to write, edit, and execute.

**Plan** is your strategic advisor. It can see everything, analyze everything, but it *can't change anything*. This is your safety net for exploring unfamiliar codebases or getting a second opinion before making changes. It's like having a senior architect review your work without ever touching the keyboard.

### Subagents: Your Specialized Task Force

Subagents are the specialists you call in for specific jobs. You can invoke them with `@mentions` in your messages, or they can be automatically summoned by primary agents when needed.

**General** is your research powerhouse. When you need to find that one function across hundreds of files, or understand a complex codebase pattern, General dives deep and emerges with answers.

**Explore** is your fast navigator. It's optimized for quick codebase exploration—finding files, understanding structure, answering "where is X?" questions in seconds.

## The Magic of Orchestration

What makes OpenCode's agent system truly powerful isn't just the individual agents—it's how they work together.

When you ask Build to implement a feature, it might automatically call Explore to find relevant files, then General to research best practices, and finally present you with a plan before writing any code. All of this happens seamlessly in the background.

You can also manually orchestrate:

```
@general help me understand how authentication works in this codebase
```

Then take those insights to Build:

```
Now let's add JWT support to the auth system
```

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
      "temperature": 0.1
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
---

You are a security expert. Look for:
- Input validation issues
- Authentication flaws
- Data exposure risks
- Dependency vulnerabilities
```

The markdown approach is beautifully simple—just write what the agent should do, and OpenCode handles the rest.

## Real-World Agent Examples

Here are some agents that teams are actually using:

**The Code Reviewer**: A subagent that never writes code, only reviews it. It has access to read files and grep, but write and edit are disabled. It focuses on best practices, potential bugs, and maintainability.

**The Test Writer**: A primary agent configured to write tests with a lower temperature for more deterministic output. It has full bash access to run tests and verify its work.

**The Documentation Specialist**: An agent that can write and edit files but can't run shell commands. Perfect for maintaining docs without risk of accidental system changes.

**The Git Guardian**: An agent with permission to run `git status`, `git log`, and `git diff`, but requires approval for `git push` or any destructive git operations.

## The Permission System: Safety Meets Autonomy

OpenCode's permission system lets you define exactly what each agent can and cannot do:

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

This means your build agent can run most commands freely, but will ask before pushing to remote, and will outright refuse to run dangerous commands.

## Temperature: The Creativity Dial

Every agent has a temperature setting that controls its creativity:

- **0.1**: Laser-focused, perfect for code analysis and security reviews
- **0.3**: Balanced, great for general development work
- **0.7**: Creative, ideal for brainstorming and exploration

## Why Agents Change Everything

Traditional AI coding assistants are like having a really smart pair programmer. OpenCode's agents are like having an entire development team at your disposal.

Need to quickly understand a new codebase? Call Explore.
Want to review a pull request? Invoke your Reviewer agent.
Need to implement a complex feature? Build orchestrates the specialists automatically.
Just want to plan and think? Switch to Plan mode and explore safely.

The agent system transforms OpenCode from a single AI assistant into a flexible, powerful platform for orchestrating AI labor. It's the difference between having a calculator and having a mathematician, a physicist, and an engineer all working together.

---

*Ready to build your AI team? Start with the built-in agents, then customize as you discover your workflow needs.*