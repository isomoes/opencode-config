import type { Plugin } from "@opencode-ai/plugin";
import { openSync, writeSync, closeSync } from "fs";

/**
 * Terminal Title Status Plugin
 *
 * Reflects the current session status in the terminal window/tab title so
 * you can see at a glance (even from another window) whether OpenCode is
 * running, retrying, idle, or hit an error.
 *
 * The label after the status icon is the FIRST user prompt of the session.
 *
 * Title format examples:
 *   ▶ OC · fix the login bug        (busy / running)
 *   ⟳ OC · fix the login bug        (retrying)
 *   ✔ OC · fix the login bug        (idle / done)
 *   ✖ OC · fix the login bug        (error)
 *
 * Implementation notes:
 * - Writes the OSC 0 escape sequence (`ESC ] 0 ; title BEL`) directly to
 *   /dev/tty so it works regardless of how stdout is being used by the TUI.
 * - Only tracks top-level (main) sessions; subagent sessions are ignored.
 * - The first prompt is captured directly from the `chat.message` hook when
 *   the user sends it (the `session.status: busy` event fires before the
 *   message is persisted, so fetching from the API at that point returns
 *   nothing). The API fetch remains as a fallback for resumed sessions.
 * - The TUI has its own terminal-title writer (`OC | <session title>`) that
 *   fires when the auto-generated session title arrives — i.e. WHILE the
 *   session is running — overwriting this plugin's title. Two defenses:
 *   the title is re-asserted (throttled) on message stream events, and you
 *   should disable the built-in writer via the command palette entry
 *   "Disable terminal title" or `OPENCODE_DISABLE_TERMINAL_TITLE=1`.
 */
export const TerminalTitlePlugin: Plugin = async ({ client }) => {
  const APP_NAME = "OC";

  // sessionID -> first user prompt of the session
  const promptCache = new Map<string, string>();
  // sessionID -> is main (top-level) session
  const mainCache = new Map<string, boolean>();

  // Current desired title — re-asserted while streaming to win against the
  // TUI's own title writer. No dedupe: competitors overwrite between writes.
  let currentTitle = "";
  // sessionID -> last status icon, so re-asserts keep the right state.
  const iconCache = new Map<string, string>();
  let lastReassert = 0;

  /** Write an OSC 0 title escape sequence straight to the controlling tty. */
  function setTerminalTitle(title: string): void {
    currentTitle = title;
    try {
      const fd = openSync("/dev/tty", "w");
      try {
        writeSync(fd, `\x1b]0;${title}\x07`);
      } finally {
        closeSync(fd);
      }
    } catch {
      // No controlling terminal (e.g. headless server) — silently skip.
    }
  }

  async function isMainSession(sessionID: string): Promise<boolean> {
    const cached = mainCache.get(sessionID);
    if (cached !== undefined) return cached;
    try {
      const response = await client.session.get({ path: { id: sessionID } });
      const session = response?.data;
      const main = !!session && !session.parentID;
      mainCache.set(sessionID, main);
      return main;
    } catch {
      return false;
    }
  }

  /** Fetch (and cache) the first user prompt of the session. */
  async function getFirstPrompt(sessionID: string): Promise<string> {
    const cached = promptCache.get(sessionID);
    if (cached !== undefined) return cached;
    try {
      const response = await client.session.messages({
        path: { id: sessionID },
      });
      const messages = response?.data ?? [];
      const firstUser = messages.find((msg: any) => msg.info?.role === "user");
      const text = extractText(firstUser?.parts as any[]);
      if (text) promptCache.set(sessionID, text);
      return text;
    } catch {
      return "";
    }
  }

  async function sessionLabel(sessionID: string): Promise<string> {
    const prompt = await getFirstPrompt(sessionID);
    if (!prompt) return APP_NAME;
    const max = 60;
    const short = prompt.length > max ? `${prompt.slice(0, max)}…` : prompt;
    return `${APP_NAME} · ${short}`;
  }

  async function update(sessionID: string, icon: string): Promise<void> {
    iconCache.set(sessionID, icon);
    setTerminalTitle(`${icon} ${await sessionLabel(sessionID)}`);
  }

  /** Extract clean text from message parts. */
  function extractText(parts: any[]): string {
    return (parts ?? [])
      .filter((part: any) => part.type === "text" && !part.synthetic)
      .map((part: any) => part.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return {
    // Fires the moment the user sends a prompt — capture it here so the
    // title already shows the prompt while the session is running.
    "chat.message": async (input, output) => {
      const sessionID = input.sessionID ?? output.message?.sessionID;
      if (!sessionID) return;

      if (!promptCache.has(sessionID)) {
        const text = extractText(output.parts as any[]);
        if (text) promptCache.set(sessionID, text);
      }

      if (await isMainSession(sessionID)) {
        await update(sessionID, "▶");
      }
    },

    event: async ({ event }) => {
      switch (event.type) {
        // While the assistant streams, message events fire constantly.
        // Re-assert our title (throttled to 1s) so the TUI's built-in
        // title writer can't win while the session is running.
        case "message.updated":
        case "message.part.updated": {
          const sessionID =
            (event.properties as any)?.info?.sessionID ??
            (event.properties as any)?.part?.sessionID;
          if (!sessionID) return;
          const icon = iconCache.get(sessionID);
          if (!icon) return; // not a session we track
          const now = Date.now();
          if (now - lastReassert < 1000) return;
          lastReassert = now;
          await update(sessionID, icon);
          break;
        }

        // Primary signal: busy / retry / idle transitions.
        case "session.status": {
          const { sessionID, status } = event.properties as {
            sessionID: string;
            status: { type: "idle" | "busy" | "retry" };
          };
          if (!sessionID || !(await isMainSession(sessionID))) return;

          if (status.type === "busy") await update(sessionID, "▶");
          else if (status.type === "retry") await update(sessionID, "⟳");
          else await update(sessionID, "✔");
          break;
        }

        // Explicit idle event — session finished responding.
        case "session.idle": {
          const sessionID = (event.properties as any)?.sessionID;
          if (!sessionID || !(await isMainSession(sessionID))) return;
          await update(sessionID, "✔");
          break;
        }

        case "session.error": {
          const sessionID = (event.properties as any)?.sessionID;
          if (sessionID && !(await isMainSession(sessionID))) return;
          const label = sessionID ? await sessionLabel(sessionID) : APP_NAME;
          setTerminalTitle(`✖ ${label}`);
          break;
        }
      }
    },
  };
};
