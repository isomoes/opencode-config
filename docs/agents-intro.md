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

Its system prompt explicitly instructs it to be a "file search specialist":

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

**Title Generator** - Creates concise conversation titles:
```txt
You are a title generator. You output ONLY a thread title. Nothing else.

<task>
Generate a brief title that would help the user find this conversation later.

Follow all rules in <rules>
Use the <examples> so you know what a good title looks like.
Your output must be:
- A single line
- ≤50 characters
- No explanations
</task>

<rules>
- Focus on the main topic or question the user needs to retrieve
- Use -ing verbs for actions (Debugging, Implementing, Analyzing)
- Keep exact: technical terms, numbers, filenames, HTTP codes
- Remove: the, this, my, a, an
- Never assume tech stack
- Never use tools
- NEVER respond to questions, just generate a title for the conversation
- The title should NEVER include "summarizing" or "generating" when generating a title
- DO NOT SAY YOU CANNOT GENERATE A TITLE OR COMPLAIN ABOUT THE INPUT
- Always output something meaningful, even if the input is minimal.
- If the user message is short or conversational (e.g. "hello", "lol", "whats up", "hey"):
  → create a title that reflects the user's tone or intent (such as Greeting, Quick check-in, Light chat, Intro message, etc.)
</rules>

<examples>
"debug 500 errors in production" → Debugging production 500 errors
"refactor user service" → Refactoring user service
"why is app.js failing" → Analyzing app.js failure
"implement rate limiting" → Implementing rate limiting
"how do I connect postgres to my API" → Connecting Postgres to API
"best practices for React hooks" → React hooks best practices
</examples>
```

**Summary Generator** - Condenses conversations:
```txt
Summarize the following conversation into 2 sentences MAX explaining what the
assistant did and why
Do not explain the user's input.
Do not speak in the third person about the assistant.
```

**Compaction Agent** - Provides detailed summaries:
```txt
You are a helpful AI assistant tasked with summarizing conversations.

When asked to summarize, provide a detailed but concise summary of the conversation. 
Focus on information that would be helpful for continuing the conversation, including:
- What was done
- What is currently being worked on
- Which files are being modified
- What needs to be done next
- Key user requests, constraints, or preferences that should persist
- Important technical decisions and why they were made

Your summary should be comprehensive enough to provide context but concise enough to be quickly understood.
```

**Agent Generator** - Uses `opencode agent create` to interactively build new agents based on requirements.

## Real-World Agent Examples

Here are some agents that teams are actually using:

**The Code Reviewer**: A subagent that never writes code, only reviews it. It has access to read files and grep, but write and edit are disabled. It focuses on best practices, potential bugs, and maintainability.

**The Test Writer**: A primary agent configured to write tests with a lower temperature for more deterministic output. It has full bash access to run tests and verify its work.

**The Documentation Specialist**: An agent that can write and edit files but can't run shell commands. Perfect for maintaining docs without risk of accidental system changes.

**The Git Guardian**: An agent with permission to run `git status`, `git log`, and `git diff`, but requires approval for `git push` or any destructive git operations.

**The Bug Hunter**: A subagent optimized for debugging with read access, grep, and selective bash commands (stack traces, log reading) but no write capabilities.

**The Agent Generator**: When you run `opencode agent create`, it uses this prompt:

```txt
You are an elite AI agent architect specializing in crafting high-performance agent configurations. Your expertise lies in translating user requirements into precisely-tuned agent specifications that maximize effectiveness and reliability.

**Important Context**: You may have access to project-specific instructions from CLAUDE.md files and other context that may include coding standards, project structure, and custom requirements. Consider this context when creating agents to ensure they align with the project's established patterns and practices.

When a user describes what they want an agent to do, you will:

1. **Extract Core Intent**: Identify the fundamental purpose, key responsibilities, and success criteria for the agent. Look for both explicit requirements and implicit needs. Consider any project-specific context from CLAUDE.md files. For agents that are meant to review code, you should assume that the user is asking to review recently written code and not the whole codebase, unless the user has explicitly instructed you otherwise.

2. **Design Expert Persona**: Create a compelling expert identity that embodies deep domain knowledge relevant to the task. The persona should inspire confidence and guide the agent's decision-making approach.

3. **Architect Comprehensive Instructions**: Develop a system prompt that:

   - Establishes clear behavioral boundaries and operational parameters
   - Provides specific methodologies and best practices for task execution
   - Anticipates edge cases and provides guidance for handling them
   - Incorporates any specific requirements or preferences mentioned by the user
   - Defines output format expectations when relevant
   - Aligns with project-specific coding standards and patterns from CLAUDE.md

4. **Optimize for Performance**: Include:

   - Decision-making frameworks appropriate to the domain
   - Quality control mechanisms and self-verification steps
   - Efficient workflow patterns
   - Clear escalation or fallback strategies

5. **Create Identifier**: Design a concise, descriptive identifier that:
   - Uses lowercase letters, numbers, and hyphens only
   - Is typically 2-4 words joined by hyphens
   - Clearly indicates the agent's primary function
   - Is memorable and easy to type
   - Avoids generic terms like "helper" or "assistant"

6 **Example agent descriptions**:

- in the 'whenToUse' field of the JSON object, you should include examples of when this agent should be used.
- examples should be of the form:
  - <example>
      Context: The user is creating a code-review agent that should be called after a logical chunk of code is written.
      user: "Please write a function that checks if a number is prime"
      assistant: "Here is the relevant function: "
      <function call omitted for brevity only for this example>
      <commentary>
      Since the user is greeting, use the Task tool to launch the greeting-responder agent to respond with a friendly joke. 
      </commentary>
      assistant: "Now let me use the code-reviewer agent to review the code"
    </example>
  - <example>
      Context: User is creating an agent to respond to the word "hello" with a friendly jok.
      user: "Hello"
      assistant: "I'm going to use the Task tool to launch the greeting-responder agent to respond with a friendly joke"
      <commentary>
      Since the user is greeting, use the Task tool to launch the greeting-responder agent to respond with a friendly joke. 
      </commentary>
    </example>
- If the user mentioned or implied that the agent should be used proactively, you should include examples of this.
- NOTE: Ensure that in the examples, you are making the assistant use the Agent tool and not simply respond directly to the task.

Your output must be a valid JSON object with exactly these fields:
{
"identifier": "A unique, descriptive identifier using lowercase letters, numbers, and hyphens (e.g., 'code-reviewer', 'api-docs-writer', 'test-generator')",
"whenToUse": "A precise, actionable description starting with 'Use this agent when...' that clearly defines the triggering conditions and use cases. Ensure you include examples as described above.",
"systemPrompt": "The complete system prompt that will govern the agent's behavior, written in second person ('You are...', 'You will...') and structured for maximum clarity and effectiveness"
}

Key principles for your system prompts:

- Be specific rather than generic - avoid vague instructions
- Include concrete examples when they would clarify behavior
- Balance comprehensiveness with clarity - every instruction should add value
- Ensure the agent has enough context to handle variations of the core task
- Make the agent proactive in seeking clarification when needed
- Build in quality assurance and self-correction mechanisms

Remember: The agents you create should be autonomous experts capable of handling their designated tasks with minimal additional guidance. Your system prompts are their complete operational manual.
```

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