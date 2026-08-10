import { Plugin } from "@opencode-ai/plugin";
import { execFile } from "child_process";
import { readdirSync } from "fs";
import { join } from "path";

/**
 * Neovim Buffer Auto-Reload Plugin
 *
 * When OpenCode edits a file, sends `:checktime` to all running Neovim
 * instances so modified buffers are reloaded.
 *
 * Performance design:
 * - Socket list is cached at startup (not re-scanned on every edit)
 * - Stale sockets are pruned from the cache on first failure
 * - Reloads are sent to all nvim instances in parallel
 * - A short debounce (100ms) deduplicates rapid consecutive edits
 *
 * No Neovim config or shell config changes required — Neovim automatically
 * creates sockets at /run/user/<uid>/nvim.<pid>.<N> which this plugin discovers.
 */
export default Plugin.define({
  id: "isomoes.nvim-reload",
  setup: ({ event }) => {
    const uid = process.getuid?.() ?? 1000;
    const runtimeDir = `/run/user/${uid}`;

    // Cache sockets at startup to avoid unnecessary filesystem scans.
    const socketCache = new Set(discoverSockets());

    let pendingDebounce: ReturnType<typeof setTimeout> | undefined;

    function discoverSockets(): string[] {
      try {
        return readdirSync(runtimeDir)
          .filter((name) => name.startsWith("nvim."))
          .map((name) => join(runtimeDir, name));
      } catch {
        return [];
      }
    }

    /** Send checktime to one socket, returning false for stale sockets. */
    function reloadInSocket(socket: string): Promise<boolean> {
      return new Promise((resolve) => {
        execFile(
          "nvim",
          ["--server", socket, "--remote-send", "<Esc>:checktime\n"],
          (error) => resolve(!error),
        );
      });
    }

    /** Broadcast checktime in parallel and prune stale sockets. */
    async function broadcastReload(): Promise<void> {
      if (socketCache.size === 0) return;

      const sockets = [...socketCache];
      const results = await Promise.allSettled(
        sockets.map((socket) => reloadInSocket(socket)),
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && !result.value) {
          socketCache.delete(sockets[index]);
        }
      });
    }

    const controller = new AbortController();
    const listen = async () => {
      try {
        for await (const update of event.subscribe({
          signal: controller.signal,
        })) {
          if (update.type !== "filesystem.changed") continue;

          discoverSockets().forEach((socket) => socketCache.add(socket));
          if (pendingDebounce) clearTimeout(pendingDebounce);
          pendingDebounce = setTimeout(async () => {
            pendingDebounce = undefined;
            await broadcastReload();
          }, 100);
        }
      } catch (error) {
        if (!controller.signal.aborted) throw error;
      }
    };

    const task = listen();
    return async () => {
      controller.abort();
      if (pendingDebounce) clearTimeout(pendingDebounce);
      await task;
    };
  },
});
