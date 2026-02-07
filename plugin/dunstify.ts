import type { Plugin } from "@opencode-ai/plugin";
import { platform } from "os";

interface NotificationOptions {
  title?: string;
  message: string;
  urgency?: "low" | "normal" | "critical";
  icon?: string;
  appname?: string;
  category?: string;
  timeout?: number;
}

/**
 * Send a notification using the appropriate system command
 */
async function sendNotification($: any, options: NotificationOptions): Promise<void> {
  const {
    title = "OpenCode",
    message,
    urgency = "normal",
    icon = "dialog-information",
    appname = "opencode",
    category = "transfer.complete",
    timeout,
  } = options;

  const currentPlatform = platform();

  try {
    if (currentPlatform === "darwin") {
      // macOS - use terminal-notifier for better notification visibility
      const args = [
        "-title", title,
        "-message", message,
        "-sound", "default",
        "-ignoreDnD",  // Ignore Do Not Disturb mode
        "-sender", "com.apple.Terminal",  // Set sender to Terminal app
        "-activate", "com.apple.Terminal",  // Activate Terminal when clicked (helps with visibility)
      ];

      // Add timeout if specified (in seconds for terminal-notifier)
      if (timeout !== undefined) {
        args.push("-timeout", String(Math.floor(timeout / 1000)));
      }

      await $`terminal-notifier ${args}`;
    } else if (currentPlatform === "linux") {
      // Linux - use dunstify
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

      await $`dunstify ${args}`;
    } else {
      // Unsupported platform
      console.log(`Notifications not supported on platform: ${currentPlatform}`);
    }
  } catch (error) {
    // Silently fail if notification command is not available
    console.error("Failed to send notification:", error);
  }
}
//
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
 * Cross-Platform Notification Plugin for OpenCode
 *
 * Sends desktop notifications for various OpenCode events.
 * - macOS: Uses osascript with AppleScript
 * - Linux: Uses dunstify (requires dunst notification daemon)
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

        await sendNotification($, {
          title: "OpenCode",
          message: `Last prompt: ${promptPreview}`,
          urgency: "normal",
        });
      }
    },
  };
};
