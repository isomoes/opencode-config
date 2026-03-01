import type { Plugin } from "@opencode-ai/plugin";
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
export const NvimReloadPlugin: Plugin = async ({ $ }) => {
  const uid = process.getuid?.() ?? 1000;
  const runtimeDir = `/run/user/${uid}`;

  // Cache sockets at startup — avoids filesystem scan on every file.edited event
  let socketCache: Set<string> = new Set(discoverSockets());

  // Debounce timer for rapid consecutive edit events
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

  /**
   * Send checktime to one socket.
   * Returns false if the socket is stale (nvim is gone).
   */
  async function reloadInSocket(socket: string): Promise<boolean> {
    try {
      await $`nvim --server ${socket} --remote-send ${"<Esc>:checktime\n"}`.quiet();
      return true;
    } catch {
      return false; // stale socket
    }
  }

  /**
   * Broadcast checktime to all cached sockets in parallel.
   * Prune any sockets that are no longer alive.
   */
  async function broadcastReload(): Promise<void> {
    if (socketCache.size === 0) {
      return;
    }

    const sockets = [...socketCache];
    const results = await Promise.allSettled(
      sockets.map((socket) => reloadInSocket(socket)),
    );

    // Prune stale sockets from cache
    results.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value === false) {
        socketCache.delete(sockets[i]);
      }
    });
  }

  return {
    event: async ({ event }) => {
      // Pick up newly opened nvim instances by refreshing the cache on file
      // watcher events (low frequency, cheap, keeps cache fresh without
      // scanning on every single file.edited).
      if (event.type === "file.watcher.updated") {
        const fresh = discoverSockets();
        fresh.forEach((s) => socketCache.add(s));
        return;
      }

      if (event.type !== "file.edited") return;

      // Debounce rapid edits (common when tools write in chunks).
      if (pendingDebounce) clearTimeout(pendingDebounce);

      pendingDebounce = setTimeout(async () => {
        pendingDebounce = undefined;
        await broadcastReload();
      }, 100);
    },
  };
};
