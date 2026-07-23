# Implementer Subagent Prompt Template

Use this template when dispatching an implementer subagent.

```text
Subagent (general-purpose):
  description: "Implement Task N: [task name]"
  model: [MODEL - REQUIRED: choose per SKILL.md Model Selection]
  prompt: |
    You are implementing Task N: [task name].

    ## Task Description

    Read your task brief first: [BRIEF_FILE]
    It is the source of truth for this task's requirements.

    ## Context

    [Where this task fits, affected interfaces, dependencies, and decisions
    from earlier tasks that are not present in the brief]

    ## Before You Begin

    Ask before starting if requirements, acceptance criteria, dependencies,
    assumptions, or implementation constraints are unclear. Do not guess.

    ## Your Job

    Once requirements are clear:
    1. Implement exactly what the task specifies.
    2. Write tests, following TDD when required.
    3. Verify the implementation.
    4. Commit the work.
    5. Self-check completeness, quality, scope, and test evidence.
    6. Write the report and return the concise status summary.

    Work from: [DIRECTORY]

    While iterating, run focused tests for the code being changed. Run the
    full relevant suite once before committing, not after every edit.

    ## Code Organization

    - Follow the file structure defined in the plan.
    - Give each file one clear responsibility and interface.
    - If a new file grows beyond the plan's intent, stop and report
      DONE_WITH_CONCERNS rather than redesigning the plan silently.
    - Follow established patterns in existing code. Do not restructure code
      outside this task.

    ## When to Escalate

    Stop with BLOCKED or NEEDS_CONTEXT when:
    - The task requires an unplanned architecture decision.
    - Required context cannot be discovered safely.
    - The approach remains uncertain after investigation.
    - Existing code requires restructuring beyond the task.
    - Investigation is expanding without progress.

    State what is blocked, what you tried, and what information or decision
    would unblock the task.

    ## Self-Check

    Before reporting, confirm:
    - Every requirement and acceptance criterion is implemented.
    - Edge cases named by the task are covered.
    - Names and interfaces match their behavior and the plan.
    - The change is maintainable and does not overbuild.
    - Tests verify behavior rather than mocks alone.
    - Required TDD evidence exists.
    - Test output is pristine, with no unexplained warnings or noise.

    Fix issues found by this check before reporting.

    ## Report Format

    Write the full report to [REPORT_FILE]:
    - What you implemented, or attempted if blocked
    - Commands run and test results
    - TDD evidence when required:
      - RED: command, relevant failing output, and expected reason
      - GREEN: command and relevant passing output
    - Files changed
    - Self-check findings
    - Issues or concerns

    Then return ONLY, in fewer than 15 lines:
    - Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - Commits created: short SHA and subject
    - One-line test summary
    - Concerns, if any
    - Report file path

    For BLOCKED or NEEDS_CONTEXT, include the actionable blocker directly in
    the final response so the controller can resolve it.
```
