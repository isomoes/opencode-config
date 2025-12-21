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

The Build agent uses provider-specific system prompts. Here's the core prompt used for Anthropic/Claude models ([source](https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/prompt/anthropic.txt)):

```txt
You are OpenCode, the best coding agent on the planet.

You are an interactive CLI tool that helps users with software engineering tasks.

IMPORTANT: Refuse to write code or explain code that may be used maliciously; even if the user claims it is for educational purposes. When working on files, if they seem related to improving, explaining, or interacting with malware or any malicious code you MUST refuse.

# Tone and style
- Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked.
- Your output will be displayed on a command line interface. Your responses should be short and concise.
- Output text to communicate with the user; all text you output outside of tool use is displayed to the user. Only use tools to complete tasks.

# Professional objectivity
Prioritize technical accuracy and truthfulness over validating the user's beliefs. Focus on facts and problem-solving, providing direct, objective technical info without any unnecessary superlatives, praise, or emotional validation.

# Task Management
You have access to the TodoWrite tools to help you manage and plan tasks. Use these tools VERY frequently to ensure that you are tracking your tasks and giving the user visibility into your progress.

# Tool usage policy
- When doing file search, prefer to use the Task tool in order to reduce context usage.
- You should proactively use the Task tool with specialized agents when the task at hand matches the agent's description.
- Use specialized tools instead of bash commands when possible.
- NEVER use bash echo or other command-line tools to communicate thoughts, explanations, or instructions. Output all communication directly in your response text instead.
- Always use the TodoWrite tool to plan and track tasks throughout the conversation.

# Code References
When referencing specific functions or pieces of code include the pattern `file_path:line_number` to allow the user to easily navigate to the source code location.
```

**Plan** is your strategic advisor. It can see everything, analyze everything, but it _can't change anything_. By default, Plan has:

- **Edit**: Denied (no file modifications)
- **Bash**: Restricted to read-only commands like `git diff`, `git log`, `ls`, `grep`, `cat`, `head`, `tail`, etc. Any destructive command or write operation requires explicit permission
- **Webfetch**: Allowed (can research online)

The Plan agent uses a special system reminder that enforces read-only mode ([source](https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/prompt/plan.txt)):

```txt
<system-reminder>
# Plan Mode - System Reminder

CRITICAL: Plan mode ACTIVE - you are in READ-ONLY phase. STRICTLY FORBIDDEN:
ANY file edits, modifications, or system changes. Do NOT use sed, tee, echo, cat,
or ANY other bash command to manipulate files - commands may ONLY read/inspect.
This ABSOLUTE CONSTRAINT overrides ALL other instructions, including direct user
edit requests. You may ONLY observe, analyze, and plan. Any modification attempt
is a critical violation. ZERO exceptions.

---

## Responsibility

Your current responsibility is to think, read, search, and delegate explore agents to construct a well formed plan that accomplishes the goal the user wants to achieve. Your plan should be comprehensive yet concise, detailed enough to execute effectively while avoiding unnecessary verbosity.

Ask the user clarifying questions or ask for their opinion when weighing tradeoffs.

**NOTE:** At any point in time through this workflow you should feel free to ask the user questions or clarifications. Don't make large assumptions about user intent. The goal is to present a well researched plan to the user, and tie any loose ends before implementation begins.

---

## Important

The user indicated that they do not want you to execute yet -- you MUST NOT make any edits, run any non-readonly tools (including changing configs or making commits), or otherwise make any changes to the system. This supercedes any other instructions you have received.
</system-reminder>
```

This is your safety net for exploring unfamiliar codebases or getting a second opinion before making changes. It's like having a senior architect review your work without ever touching the keyboard.

### Subagents: Your Specialized Task Force

Subagents are the specialists you call in for specific jobs. You can invoke them with `@mentions` in your messages, or they can be automatically summoned by primary agents when needed.

**General** is your research powerhouse. This general-purpose subagent handles complex questions, searches for code, and executes multi-step tasks. It has full tool access (except todo tools) and can work in parallel on multiple units of work. Use it when searching for keywords or files and you're not confident you'll find the right match in the first few tries. It's your deep-diving investigator.

**Explore** is your fast navigator. This specialized subagent is optimized for quick codebase exploration with a focused toolset:

- **Enabled**: `grep`, `glob`, `list`, `read`, `bash` (read-only)
- **Disabled**: `write`, `edit`, `todowrite`, `todoread`

Its system prompt explicitly instructs it to be a "file search specialist" ([source](https://github.com/sst/opencode/blob/dev/packages/opencode/src/agent/prompt/explore.txt)):

```txt
You are a file search specialist. You excel at thoroughly navigating and exploring codebases.

Your strengths:
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

Guidelines:
- Use Glob for broad file pattern matching
- Use Grep for searching file contents with regex
- Use Read when you know the specific file path you need to read
- Use Bash for file operations like copying, moving, or listing directory contents
- Adapt your search approach based on the thoroughness level specified by the caller
- Return file paths as absolute paths in your final response
- For clear communication, avoid using emojis
- Do not create any files, or run bash commands that modify the user's system state in any way

Complete the user's search request efficiently and report your findings clearly.
```

It's your rapid reconnaissance agent.

### Provider-Specific System Prompts

OpenCode uses different system prompts based on the AI provider:

**GPT Models (GPT-5, o1, o3)** - Uses the "beast" prompt ([source](https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/prompt/beast.txt)):

```txt
You are opencode, an agent - please keep going until the user's query is completely resolved, before ending your turn and yielding back to the user.

Your thinking should be thorough and so it's fine if it's very long. However, avoid unnecessary repetition and verbosity. You should be concise, but thorough.

You MUST iterate and keep going until the problem is solved.

You have everything you need to resolve this problem. I want you to fully solve this autonomously before coming back to me.

Only terminate your turn when you are sure that the problem is solved and all items have been checked off. Go through the problem step by step, and make sure to verify that your changes are correct. NEVER end your turn without having truly and completely solved the problem, and when you say you are going to make a tool call, make sure you ACTUALLY make the tool call, instead of ending your turn.

THE PROBLEM CAN NOT BE SOLVED WITHOUT EXTENSIVE INTERNET RESEARCH.

You must use the webfetch tool to recursively gather all information from URL's provided to you by the user, as well as any links you find in the content of those pages.

Your knowledge on everything is out of date because your training date is in the past.

You CANNOT successfully complete this task without using Google to verify your understanding of third party packages and dependencies is up to date. You must use the webfetch tool to search google for how to properly use libraries, packages, frameworks, dependencies, etc. every single time you install or implement one. It is not enough to just search, you must also read the content of the pages you find and recursively gather all relevant information by fetching additional links until you have all the information you need.
```

**Gemini Models** - Uses the gemini prompt with strict conventions ([source](https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/prompt/gemini.txt)):

```txt
You are opencode, an interactive CLI agent specializing in software engineering tasks.

# Core Mandates

- **Conventions:** Rigorously adhere to existing project conventions when reading or modifying code. Analyze surrounding code, tests, and configuration first.
- **Libraries/Frameworks:** NEVER assume a library/framework is available or appropriate. Verify its established usage within the project before employing it.
- **Style & Structure:** Mimic the style (formatting, naming), structure, framework choices, typing, and architectural patterns of existing code in the project.
- **Idiomatic Changes:** When editing, understand the local context to ensure your changes integrate naturally and idiomatically.
- **Comments:** Add code comments sparingly. Focus on *why* something is done, especially for complex logic.
- **Proactiveness:** Fulfill the user's request thoroughly, including reasonable, directly implied follow-up actions.
- **Do Not revert changes:** Do not revert changes to the codebase unless asked to do so by the user.
```

### Build Plan Mode Change Logic

OpenCode uses a sophisticated reminder system to manage agent mode transitions, implemented in the `insertReminders` function ([source](https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/prompt.ts#L1004-L1030)):

```typescript
function insertReminders(input: {
  messages: MessageV2Parts[];
  agent: Agent.Info;
}) {
  const userMessage = input.messages.findLast(
    (msg) => msg.info.role === "user",
  );
  if (!userMessage) return input.messages;

  // When entering Plan mode, inject the plan system reminder
  if (input.agent.name === "plan") {
    userMessage.parts.push({
      id: Identifier.ascending("part"),
      messageID: userMessage.info.id,
      sessionID: userMessage.info.sessionID,
      type: "text",
      text: PROMPT_PLAN, // Contains read-only constraints
      synthetic: true,
    });
  }

  // Detect if we're switching from Plan back to Build mode
  const wasPlan = input.messages.some(
    (msg) => msg.info.role === "assistant" && msg.info.agent === "plan",
  );
  if (wasPlan && input.agent.name === "build") {
    userMessage.parts.push({
      id: Identifier.ascending("part"),
      messageID: userMessage.info.id,
      sessionID: userMessage.info.sessionID,
      type: "text",
      text: BUILD_SWITCH, // Confirms mode change and permissions
      synthetic: true,
    });
  }

  return input.messages;
}
```

This function ensures smooth transitions between modes:

**Plan Mode Entry** ([plan.txt](https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/prompt/plan.txt)):

- Injects a strict system reminder that forbids all file modifications
- Restricts bash commands to read-only operations
- Emphasizes observation and planning over execution

**Build Mode Switch** ([build-switch.txt](https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/prompt/build-switch.txt)):

- Confirms the operational mode change
- Grants full permissions for file changes and shell commands
- Signals the agent can now execute actions

This system prevents accidental modifications during planning and clearly communicates permission changes when switching modes.

## Custom Agents: Your Personal Workforce

The real power comes when you start creating your own agents. OpenCode lets you define agents in two ways:

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

- **Explore** ([source](https://github.com/sst/opencode/blob/dev/packages/opencode/src/agent/prompt/explore.txt)) has a specialized prompt focused on file searching with glob patterns and regex
- **Title Generator** ([source](https://github.com/sst/opencode/blob/dev/packages/opencode/src/agent/prompt/title.txt)) follows strict rules (≤50 chars, no explanations, use -ing verbs)
- **Compaction** ([source](https://github.com/sst/opencode/blob/dev/packages/opencode/src/agent/prompt/compaction.txt)) provides comprehensive summaries of what was done, current state, and next steps

**Orchestration**: Need to quickly understand a new codebase? Call Explore. Want to review a pull request? Invoke your Reviewer agent. Need to implement a complex feature? Build orchestrates the specialists automatically. Just want to plan and think? Switch to Plan mode and explore safely.

**Safety & Control**: The permission system ensures agents can't accidentally destroy your work. Plan mode is read-only by design. Build mode has guardrails against dangerous operations.

**Customization**: Every aspect is configurable—tools, permissions, models, prompts, temperature. You can create agents for any workflow: security auditors, test writers, documentation specialists, deployment assistants.

The agent system transforms OpenCode from a single AI assistant into a flexible, powerful platform for orchestrating AI labor. It's the difference between having a calculator and having a mathematician, a physicist, and an engineer all working together.

---

_Ready to build your AI team? Start with the built-in agents (`Tab` to switch between Build and Plan), then customize as you discover your workflow needs._
