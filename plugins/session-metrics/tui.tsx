import type { SessionMessageInfo } from "@opencode-ai/client";
import { Plugin } from "@opencode-ai/plugin/tui";

const PLUGIN_ID = "session-metrics";

function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, milliseconds) / 1000;
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m${Math.floor(seconds % 60)}s`;
  }
  return `${seconds.toFixed(1)}s`;
}

function sessionMetrics(messages: SessionMessageInfo[]) {
  let turns = 0;
  let steps = 0;
  let llmMilliseconds = 0;
  let toolMilliseconds = 0;

  for (const message of messages) {
    if (message.type === "user") {
      turns++;
      continue;
    }
    if (message.type !== "assistant") continue;

    steps++;
    const completed = message.time.completed ?? Date.now();
    const assistantMilliseconds = Math.max(0, completed - message.time.created);
    let messageToolMilliseconds = 0;
    for (const part of message.content) {
      if (part.type !== "tool") continue;
      const toolEnd = part.time.completed ?? Date.now();
      const toolStart = part.time.ran ?? part.time.created;
      messageToolMilliseconds += Math.max(0, toolEnd - toolStart);
    }
    toolMilliseconds += messageToolMilliseconds;
    llmMilliseconds += Math.max(0, assistantMilliseconds - messageToolMilliseconds);
  }

  return { turns, steps, llmMilliseconds, toolMilliseconds };
}

export const tui = Plugin.define({
  id: PLUGIN_ID,
  setup: (context) => {
    const [footerState, updateFooterState] = context.storage.memory("footer", { initial: { version: 0 } });
    const stopEvents = context.data.listen(({ details }) => {
      const sessionID = (details.data as { sessionID?: string } | undefined)?.sessionID;
      if (!sessionID) return;
      updateFooterState((state) => {
        state.version++;
      });
    });

    context.ui.slot({
      append: "prompt.footer.status",
      render: ({ sessionID }) => {
        footerState.version;
        if (!sessionID) return <text />;
        const metrics = sessionMetrics(context.data.session.message.list(sessionID));
        return (
          <text fg={context.theme.text.default}>
            {metrics.turns}T · {metrics.steps}S | LLM {formatDuration(metrics.llmMilliseconds)} · tools {formatDuration(metrics.toolMilliseconds)}
          </text>
        );
      },
    });

    return stopEvents;
  },
});

export default tui;
