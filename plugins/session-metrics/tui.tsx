import type { SessionMessageInfo } from "@opencode/client";
import { Plugin } from "@opencode/plugin/tui";

function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, milliseconds) / 1000;
  return seconds >= 60
    ? `${Math.floor(seconds / 60)}m${Math.floor(seconds % 60)}s`
    : `${seconds.toFixed(1)}s`;
}

export function sessionMetrics(
  messages: readonly SessionMessageInfo[],
  now = Date.now(),
) {
  let turns = 0;
  let steps = 0;
  let llm = 0;
  let tools = 0;
  for (const message of messages) {
    if (message.type === "user") {
      turns++;
      continue;
    }
    if (message.type !== "assistant") continue;
    steps++;
    const end = message.time.completed ?? now;
    // Union tool intervals so parallel calls are not counted twice.
    const intervals = message.content
      .flatMap((part): [number, number][] => {
        if (part.type !== "tool" || part.time.ran === undefined) return [];
        return [[part.time.ran, Math.min(part.time.completed ?? end, end)]];
      })
      .sort((a, b) => a[0] - b[0]);
    let toolTime = 0;
    let through = message.time.created;
    for (const [start, stop] of intervals) {
      toolTime += Math.max(0, stop - Math.max(start, through));
      through = Math.max(through, stop);
    }
    tools += toolTime;
    llm += Math.max(0, end - message.time.created - toolTime);
  }
  return { turns, steps, llm, tools };
}

export default Plugin.define({
  id: "session-metrics",
  setup(context) {
    return context.ui.slot({
      append: "prompt.footer.status",
      render: (props) => {
        const label = () => {
          if (!props.sessionID) return "";
          const metrics = sessionMetrics(
            context.data.session.message.list(props.sessionID),
          );
          return `${metrics.turns}T · ${metrics.steps}S | LLM ${formatDuration(metrics.llm)} · tools ${formatDuration(metrics.tools)}`;
        };
        return <text fg={context.theme.text.base}>{label()}</text>;
      },
    });
  },
});
