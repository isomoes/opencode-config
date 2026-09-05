import { Plugin } from "@opencode-ai/plugin/tui";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const PLUGIN_ID = "window-title-notifications";
const PID = String(process.pid);
const STATE_HOME = process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
const STATE_PATH = join(STATE_HOME, "opencode", "window-numbers.json");
const LOCK_PATH = `${STATE_PATH}.lock`;

interface WindowRegistry {
  active: Record<string, number>;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readRegistry(): WindowRegistry {
  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, "utf8")) as Partial<WindowRegistry>;
    if (!parsed.active || typeof parsed.active !== "object") return { active: {} };
    return { active: parsed.active as Record<string, number> };
  } catch {
    return { active: {} };
  }
}

function writeRegistry(registry: WindowRegistry): void {
  const temporaryPath = `${STATE_PATH}.${PID}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(registry));
  renameSync(temporaryPath, STATE_PATH);
}

function withRegistryLock<T>(operation: () => T): T {
  mkdirSync(dirname(STATE_PATH), { recursive: true });

  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const lock = openSync(LOCK_PATH, "wx");
      try {
        writeSync(lock, PID);
        return operation();
      } finally {
        closeSync(lock);
        unlinkSync(LOCK_PATH);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;

      try {
        const ownerText = readFileSync(LOCK_PATH, "utf8").trim();
        const owner = Number(ownerText);
        if (ownerText && (!owner || !processIsAlive(owner))) {
          unlinkSync(LOCK_PATH);
        } else if (!ownerText && Date.now() - statSync(LOCK_PATH).mtimeMs > 1000) {
          unlinkSync(LOCK_PATH);
        }
      } catch {
        // The lock may have been released between the reads above.
      }

      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }

  throw new Error("Timed out acquiring OpenCode window-number lock");
}

function allocateWindowNumber(): number {
  return withRegistryLock(() => {
    const registry = readRegistry();
    const active: Record<string, number> = {};

    for (const [pid, number] of Object.entries(registry.active)) {
      if (pid === PID || processIsAlive(Number(pid))) active[pid] = number;
    }

    if (active[PID]) {
      writeRegistry({ active });
      return active[PID];
    }

    const used = new Set(Object.values(active));
    let number = 1;
    while (used.has(number)) number++;
    active[PID] = number;
    writeRegistry({ active });
    return number;
  });
}

function releaseWindowNumber(): void {
  try {
    withRegistryLock(() => {
      const registry = readRegistry();
      delete registry.active[PID];
      writeRegistry(registry);
    });
  } catch {
    // Cleanup must not prevent OpenCode from closing.
  }
}

function cleanTitle(value: string | undefined): string | undefined {
  const title = value
    ?.replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return undefined;
  return title.length > 40 ? `${title.slice(0, 37)}...` : title;
}

type SoundName = "question" | "permission" | "error" | "done" | "subagent_done";

export default Plugin.define({
  id: PLUGIN_ID,
  setup: (context) => {
    const windowNumber = allocateWindowNumber();
    let titleTimer: ReturnType<typeof setTimeout> | undefined;

    const updateTitle = () => {
      titleTimer = undefined;
      const activeTab = context.ui.tabs.list().find((tab) => tab.active);
      const title = cleanTitle(activeTab?.title);
      context.renderer.setTerminalTitle(
        title ? `[${windowNumber}] OC | ${title}` : `[${windowNumber}] OC`,
      );
    };

    const scheduleTitleUpdate = () => {
      if (titleTimer !== undefined) clearTimeout(titleTimer);
      titleTimer = setTimeout(updateTitle, 0);
    };

    // The built-in route title effect can run after a tab change. Reassert the
    // numbered title periodically so it remains visible after that update.
    const titleInterval = setInterval(updateTitle, 1000);

    const tabForSession = (sessionID: string) =>
      context.ui.tabs.list().find((tab) => tab.sessionID === sessionID);

    const notify = (sessionID: string, message: string, sound: SoundName, notification = true) => {
      const session = context.data.session.get(sessionID);
      const tab = tabForSession(sessionID);
      const sessionTitle = cleanTitle(tab?.title ?? session?.title);
      const isSubagent = Boolean(session?.parentID);

      if (!tab && !isSubagent) return;

      void context.attention
        .notify({
          title: `[${windowNumber}] OpenCode`,
          message: sessionTitle ? `${message}: ${sessionTitle}` : message,
          notification: notification && !isSubagent ? { when: "blurred" } : false,
          sound: { name: sound, when: "always" },
        })
        .then((result) => {
          // Keep the result observable while diagnosing attention integration.
          if (!result.ok && result.skipped) {
            context.ui.toast.show({
              variant: "warning",
              message: `Notification skipped: ${result.skipped}`,
            });
          }
        })
        .catch((error) => {
          context.ui.toast.show({
            variant: "error",
            message: error instanceof Error ? error.message : "Notification failed",
          });
        });
    };

    const pendingForms = new Set<string>();
    const pendingPermissions = new Set<string>();
    const pendingQuestions = new Set<string>();

    const stopEvents = context.data.listen(({ details }) => {
      switch (details.type) {
        case "tui.session.select":
        case "session.created":
        case "session.deleted":
        case "session.renamed":
          scheduleTitleUpdate();
          return;
        case "session.idle":
        case "session.error": {
          scheduleTitleUpdate();
          const sessionID = details.data.sessionID;
          const failed = details.type === "session.error";
          notify(sessionID, failed ? "failed" : "finished", failed ? "error" : "done");
          return;
        }
        case "form.created": {
          const form = details.data.form;
          if (pendingForms.has(form.id)) return;
          pendingForms.add(form.id);
          notify(form.sessionID, "Input needs response", "question");
          return;
        }
        case "form.replied":
        case "form.cancelled":
          pendingForms.delete(details.data.id);
          return;
        case "question.asked": {
          const requestID = details.data.id;
          if (pendingQuestions.has(requestID)) return;
          pendingQuestions.add(requestID);
          notify(details.data.sessionID, "Input needs response", "question");
          return;
        }
        case "question.replied":
        case "question.rejected":
          pendingQuestions.delete(details.data.requestID);
          return;
        case "permission.asked": {
          const requestID = details.data.id;
          if (pendingPermissions.has(requestID)) return;
          pendingPermissions.add(requestID);
          notify(details.data.sessionID, "Permission needs input", "permission");
          return;
        }
        case "permission.replied":
          pendingPermissions.delete(details.data.requestID);
          return;
        }
    });

    updateTitle();
    return () => {
      stopEvents();
      if (titleTimer !== undefined) clearTimeout(titleTimer);
      clearInterval(titleInterval);
      releaseWindowNumber();
    };
  },
});
