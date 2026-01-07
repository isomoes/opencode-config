import type { Plugin } from "@opencode-ai/plugin";

interface DunstifyOptions {
  title?: string;
  message: string;
  urgency?: "low" | "normal" | "critical";
  icon?: string;
  appname?: string;
  category?: string;
  timeout?: number;
}

/**
 * Send a dunstify notification
 */
async function sendDunstify($: any, options: DunstifyOptions): Promise<void> {
  const {
    title = "OpenCode",
    message,
    urgency = "normal",
    icon = "dialog-information",
    appname = "opencode",
    category = "transfer.complete",
    timeout,
  } = options;

  const args = [
    title,
    message,
    "-u",
    urgency,
    "-i",
    icon,
    "-a",
    appname,
    "-c",
    category,
  ];

  if (timeout !== undefined) {
    args.push("-t", String(timeout));
  }

  try {
    await $`dunstify ${args}`;
  } catch (error) {
    // Silently fail if dunstify is not available
    console.error("Failed to send dunstify notification:", error);
  }
}

/**
 * Extract the last user prompt from session messages
 */
async function getLastUserPrompt(
  client: any,
  sessionID: string,
): Promise<string> {
  try {
    const response = await client.session.messages({
      path: { id: sessionID },
    });

    if (!response || !response.data) {
      return "";
    }

    // Find the last user message
    const lastUserMessage = response.data
      .filter((msg: any) => msg.info?.role === "user")
      .pop();

    if (!lastUserMessage || !lastUserMessage.parts) {
      return "";
    }

    // Extract text from text parts
    const textParts = lastUserMessage.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join(" ");

    return textParts;
  } catch (error) {
    console.error("Failed to fetch session messages:", error);
    return "";
  }
}

/**
 * Create a prompt preview string
 */
function createPromptPreview(prompt: string): string {
  if (!prompt) {
    return "No prompt available";
  }

  const maxLength = 100;
  if (prompt.length <= maxLength) {
    return `"${prompt}"`;
  }

  return `"${prompt.substring(0, maxLength)}..."`;
}

/**
 * Dunstify Notification Plugin for OpenCode
 *
 * Sends desktop notifications using dunstify for various OpenCode events.
 * This is particularly useful for Linux users running the dunst notification daemon.
 *
 * @example
 * // Basic usage - just load the plugin
 * // It will automatically send notifications for key events
 *
 * @example
 * // To disable specific event notifications, modify the enabledEvents array below
 */
export const DunstifyPlugin: Plugin = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  // Events to send notifications for
  const enabledEvents = ["session.idle"];

  return {
    event: async ({ event }) => {
      // Only send notifications for enabled events
      if (!enabledEvents.includes(event.type)) {
        return;
      }

      // Handle session.idle event - fetch last user prompt
      if (event.type === "session.idle") {
        const sessionID = event.properties?.sessionID;
        if (!sessionID) {
          return;
        }

        const lastPrompt = await getLastUserPrompt(client, sessionID);
        const promptPreview = createPromptPreview(lastPrompt);

        await sendDunstify($, {
          title: "OpenCode",
          message: `Last prompt: ${promptPreview}`,
          urgency: "normal",
        });
      }
    },
  };
};
