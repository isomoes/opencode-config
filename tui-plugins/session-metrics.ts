import type { TuiPlugin } from "@opencode-ai/plugin/tui";
import { TextRenderable } from "@opentui/core";
import { createEffect, onCleanup, type JSX } from "solid-js";

function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, milliseconds) / 1000;
  return seconds >= 60
    ? `${Math.floor(seconds / 60)}m${Math.floor(seconds % 60)}s`
    : `${seconds.toFixed(1)}s`;
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    slots: {
      session_prompt_right: (_context, props) => {
        const label = () => {
          let turns = 0;
          let steps = 0;
          let llm = 0;
          let tools = 0;
          for (const message of api.state.session.messages(props.session_id)) {
            if (message.role === "user") {
              // Migration summaries and switch notes are not user turns.
              if (api.state.part(message.id).some((part) =>
                part.type === "text" && !part.synthetic && !part.ignored,
              )) turns++;
              continue;
            }
            steps++;
            const end = message.time.completed ?? Date.now();
            // Union tool intervals so overlapping calls are not counted twice.
            const intervals = api.state.part(message.id)
              .flatMap((part): [number, number][] => {
                if (part.type !== "tool" || part.state.status === "pending") return [];
                const stop = part.state.status === "running" ? end : part.state.time.end;
                return [[part.state.time.start, Math.min(stop, end)]];
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
          return `${turns}T · ${steps}S | LLM ${formatDuration(llm)} · tools ${formatDuration(tools)}`;
        };
        const text = new TextRenderable(api.renderer, {
          id: `session-metrics-${props.session_id}`,
          content: label(),
          fg: api.theme.current.textMuted,
        });
        createEffect(() => {
          text.content = label();
          text.fg = api.theme.current.textMuted;
        });
        onCleanup(() => text.destroy());
        // OpenTUI consumes Renderable nodes; the SDK's Solid type uses DOM JSX.
        return text as unknown as JSX.Element;
      },
    },
  });
};

export default { id: "session-metrics", tui };
