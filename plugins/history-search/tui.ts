import { Plugin } from "@opencode-ai/plugin/tui";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * TUI Prompt History Search Plugin
 *
 * Implements https://github.com/anomalyco/opencode/issues/5062 as a TUI
 * plugin (reverse-i-search): press ctrl+r (or run "Search Prompt History"
 * from the command palette / "/history-search") to search ALL prompts ever
 * sent — every project, every session. Selecting an entry copies it to the
 * clipboard without sending it. Clipboard insertion is used because the
 * `tui.prompt.append` event is not available in all OpenCode v2 dev builds.
 *
 * History sources:
 * - ~/.local/share/opencode/opencode.db  (all sent user prompts, all projects)
 * - ~/.local/state/opencode/prompt-history.jsonl (recent TUI entries)
 *
 * Performance design (the db can be gigabytes):
 * - The expensive full table scan runs at most ONCE ever; results persist in
 *   a JSON cache file, so subsequent startups only JSON.parse the cache.
 * - Refreshes are incremental: `WHERE m.time_created > lastSeen` (~1ms).
 * - Message rows are prefiltered with a cheap LIKE on the raw JSON; per-row
 *   json_extract only runs on the small joined part set. This alone cut the
 *   full scan from ~730ms to ~230ms on a 2GB db.
 * - Dialog options are memoized per cache generation, not rebuilt per open.
 *
 * Registered in cli.json:  "plugins": ["./plugins/history-search/tui.ts"]
 * Requires "session.rename": "none" in cli.json keybinds to free ctrl+r.
 *
 * Implementation approach follows jia-kai/opencode-productivity.
 */

const PLUGIN_ID = "history-search";
const HISTORY_LIMIT = 3000;
const CACHE_VERSION = 1;
/** Prompts longer than this are not kept in history (pasted walls of text). */
const MAX_PROMPT_CHARS = 32_000;
/**
 * Max options handed to DialogSelect at once. Its scrollbox is not
 * virtualized: every option becomes a live renderable, and several of its
 * handlers are O(rendered options). Searching still covers ALL entries —
 * only the displayed slice is capped.
 */

interface HistoryEntry {
  id: string;
  prompt: string;
  createdAt: number; // epoch ms, 0 = undated (TUI history file)
  directory?: string;
}

interface CacheFile {
  version: number;
  lastSeen: number;
  entries: HistoryEntry[];
}

const DATA_HOME = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
const STATE_HOME = process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
const CACHE_HOME = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
const DB_PATH = join(DATA_HOME, "opencode", "opencode.db");
const TUI_HISTORY_PATH = join(STATE_HOME, "opencode", "prompt-history.jsonl");
const CACHE_PATH = join(CACHE_HOME, "opencode", "history-search-cache.json");

// ---------------------------------------------------------------------------
// Database loading
// ---------------------------------------------------------------------------

/**
 * Text parts of user messages in real (non-subagent) sessions, newer than
 * ?2, newest first. The message-level filter deliberately uses only a LIKE
 * prefilter on the raw JSON: message.data is small metadata where
 * `"role":"user"` cannot false-positive, and skipping json_extract there
 * keeps SQLite from JSON-parsing every message row in the table. The
 * accurate JSON checks run on the small indexed part join instead.
 */
const SQL = `
  WITH recent AS (
    SELECT m.id AS id, m.time_created AS createdAt, s.directory AS directory
    FROM message m
    JOIN session s ON s.id = m.session_id
    WHERE m.time_created > ?2
      AND s.parent_id IS NULL
      AND m.data LIKE '%"role":"user"%'
    ORDER BY m.time_created DESC
    LIMIT ?1
  )
  SELECT r.id AS id, r.createdAt AS createdAt, r.directory AS directory,
         p.id AS partID, json_extract(p.data, '$.text') AS text
  FROM recent r
  JOIN part p ON p.message_id = r.id
  WHERE p.data LIKE '%"type":"text"%'
    AND json_valid(p.data) AND json_extract(p.data, '$.type') = 'text'
    AND json_extract(p.data, '$.text') IS NOT NULL
    AND COALESCE(json_extract(p.data, '$.synthetic'), 0) = 0
`;

interface PartRow {
  id: string;
  createdAt: number;
  directory: string;
  partID: string;
  text: string;
}

function queryPartRows(since: number): PartRow[] {
  if (!existsSync(DB_PATH)) return [];
  let db: any;
  try {
    // Resolve sqlite from the runtime (opencode ships as a Bun binary).
    const require = Function("return typeof require === 'function' ? require : undefined")() as
      | ((id: string) => any)
      | undefined;
    const getBuiltin = (process as any).getBuiltinModule as ((id: string) => any) | undefined;
    const bunSqlite = getBuiltin?.("bun:sqlite") ?? require?.("bun:sqlite");
    if (bunSqlite?.Database) {
      db = new bunSqlite.Database(DB_PATH, { readonly: true });
      return db.query(SQL).all(HISTORY_LIMIT, since) as PartRow[];
    }
    const nodeSqlite = getBuiltin?.("node:sqlite");
    if (nodeSqlite?.DatabaseSync) {
      db = new nodeSqlite.DatabaseSync(DB_PATH, { readOnly: true });
      return db.prepare(SQL).all(HISTORY_LIMIT, since) as PartRow[];
    }
    return [];
  } catch {
    return [];
  } finally {
    try {
      db?.close();
    } catch {
      // ignore
    }
  }
}

/** Aggregate part rows into one entry per message, newest first. */
function loadDatabaseHistory(since: number): HistoryEntry[] {
  const byMessage = new Map<string, { entry: HistoryEntry; parts: { partID: string; text: string }[] }>();
  for (const row of queryPartRows(since)) {
    let group = byMessage.get(row.id);
    if (!group) {
      group = {
        entry: { id: row.id, prompt: "", createdAt: row.createdAt, directory: row.directory ?? undefined },
        parts: [],
      };
      byMessage.set(row.id, group);
    }
    group.parts.push({ partID: row.partID, text: row.text });
  }
  const entries: HistoryEntry[] = [];
  for (const group of byMessage.values()) {
    group.parts.sort((a, b) => (a.partID < b.partID ? -1 : 1));
    const prompt = group.parts
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (!prompt || prompt.length > MAX_PROMPT_CHARS) continue;
    group.entry.prompt = prompt;
    entries.push(group.entry);
  }
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

// ---------------------------------------------------------------------------
// Disk cache: makes startup instant and full scans one-time-only
// ---------------------------------------------------------------------------

function readCacheFile(): CacheFile | undefined {
  try {
    if (!existsSync(CACHE_PATH)) return undefined;
    const parsed = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
    if (parsed?.version !== CACHE_VERSION || !Array.isArray(parsed.entries)) return undefined;
    return parsed as CacheFile;
  } catch {
    return undefined;
  }
}

function writeCacheFile(cache: CacheFile): void {
  try {
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    const tmp = `${CACHE_PATH}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(cache));
    renameSync(tmp, CACHE_PATH); // atomic: never leaves a torn cache
  } catch {
    // cache persistence is best-effort
  }
}

// ---------------------------------------------------------------------------
// TUI prompt-history file (recent, includes not-yet-persisted prompts)
// ---------------------------------------------------------------------------

function loadTuiFileHistory(): HistoryEntry[] {
  if (!existsSync(TUI_HISTORY_PATH)) return [];
  const entries: HistoryEntry[] = [];
  try {
    const lines = readFileSync(TUI_HISTORY_PATH, "utf8").split("\n");
    for (const [index, line] of lines.reverse().entries()) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const prompt = typeof parsed?.input === "string" ? parsed.input.trim() : "";
        if (prompt && prompt.length <= MAX_PROMPT_CHARS) entries.push({ id: `tui-${index}`, prompt, createdAt: 0 });
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // unreadable file: db history still works
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function preview(value: string, max = 160): string {
  // Avoid regex-flattening megabyte prompts: only the visible prefix matters.
  const flat = oneLine(value.slice(0, max * 4));
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

function describe(entry: HistoryEntry): string {
  const when = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "recent";
  const where = entry.directory ? entry.directory.replace(homedir(), "~") : "";
  return where ? `${when} · ${where}` : when;
}

function dedupeKey(prompt: string): string {
  return oneLine(prompt.slice(0, 512)).toLowerCase();
}

function copyToClipboard(text: string): Promise<void> {
  const commands: [string, string[]][] =
    process.platform === "darwin"
      ? [["pbcopy", []]]
      : [
          ["wl-copy", []],
          ["xclip", ["-selection", "clipboard"]],
          ["xsel", ["--clipboard", "--input"]],
        ];

  return new Promise((resolve, reject) => {
    const tryNext = (index: number, lastError?: Error) => {
      const command = commands[index];
      if (!command) {
        reject(lastError ?? new Error("No supported clipboard command found"));
        return;
      }

      let child: ReturnType<typeof spawn>;
      let finished = false;
      try {
        child = spawn(command[0], command[1]);
      } catch (error) {
        tryNext(index + 1, error instanceof Error ? error : new Error(String(error)));
        return;
      }

      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => {
        if (finished) return;
        finished = true;
        tryNext(index + 1, error);
      });
      child.on("close", (code) => {
        if (finished) return;
        finished = true;
        if (code === 0) {
          resolve();
        } else {
          tryNext(index + 1, new Error(stderr.trim() || `${command[0]} exited with code ${code}`));
        }
      });
      child.stdin?.end(text);
    };

    tryNext(0);
  });
}

// ---------------------------------------------------------------------------
// Search index
// ---------------------------------------------------------------------------

interface IndexedOption {
  /** Dialog option value: a short string, not the entry object. */
  id: string;
  title: string;
  description: string;
}
// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const tui = Plugin.define({
  id: PLUGIN_ID,
  setup: (context) => {
  let dbEntries: HistoryEntry[] = [];
  let lastSeen = 0;
  let index: IndexedOption[] = [];
  let byId = new Map<string, HistoryEntry>();
  let inflight: Promise<void> | undefined;

  /** Rebuild the memoized search index from db entries + TUI file. */
  const rebuildOptions = () => {
    const seen = new Set<string>();
    const nextIndex: IndexedOption[] = [];
    const nextById = new Map<string, HistoryEntry>();
    for (const entry of [...dbEntries, ...loadTuiFileHistory()]) {
      const key = dedupeKey(entry.prompt);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const description = describe(entry);
      nextById.set(entry.id, entry);
      nextIndex.push({
        id: entry.id,
        title: preview(entry.prompt),
        description,
      });
    }
    index = nextIndex;
    byId = nextById;
  };

  /**
   * Refresh db entries. First call after a cold start (no cache file) pays
   * the one-time full scan (~230ms); every other call is an incremental
   * `time_created > lastSeen` query (~1ms).
   */
  const refresh = (): Promise<void> => {
    inflight ??= new Promise<void>((resolve) => {
      setTimeout(() => {
        try {
          const fresh = loadDatabaseHistory(lastSeen);
          if (fresh.length > 0 || dbEntries.length === 0) {
            if (fresh.length > 0) {
              const known = new Set(fresh.map((entry) => entry.id));
              dbEntries = [...fresh, ...dbEntries.filter((entry) => !known.has(entry.id))].slice(0, HISTORY_LIMIT);
              lastSeen = Math.max(lastSeen, ...fresh.map((entry) => entry.createdAt));
              writeCacheFile({ version: CACHE_VERSION, lastSeen, entries: dbEntries });
            }
            rebuildOptions();
          }
        } finally {
          inflight = undefined;
          resolve();
        }
      }, 0);
    });
    return inflight;
  };

  // Startup: hydrate from the disk cache (fast JSON.parse), then top up
  // incrementally. Without a cache file this falls back to the full scan.
  const cached = readCacheFile();
  if (cached) {
    dbEntries = cached.entries;
    lastSeen = cached.lastSeen;
    rebuildOptions();
  }
  void refresh();

  const openHistoryDialog = async () => {
    if (index.length === 0) await refresh();
    void refresh(); // ~1ms incremental: picks up prompts sent since last open
    if (index.length === 0) {
      context.ui.toast.show({ variant: "warning", message: "No prompt history found" });
      return;
    }
    const selected = await context.ui.dialog.select({
      title: "Prompt History",
      placeholder: `Search ${index.length} prompts...`,
      options: index.map((item) => ({
        // Keep each option small so native filtering stays responsive.
        title: item.title,
        description: item.description,
        value: item.id,
      })),
    });
    if (selected) {
      const entry = byId.get(selected);
      if (entry) void insertPrompt(entry.prompt);
    }
  };

  const insertPrompt = async (text: string) => {
    if (!text) return;
    try {
      await copyToClipboard(text);
      context.ui.toast.show({ variant: "success", message: "Prompt copied to clipboard; paste it into the editor" });
    } catch (error) {
      context.ui.toast.show({
        variant: "error",
        message: error instanceof Error ? error.message : "Failed to insert prompt",
      });
    }
  };

  context.ui.slot({ append: "app", render: () => {
    context.keymap.layer(() => ({
      mode: "global",
      priority: 100,
      commands: [
        {
          id: "history.search",
          title: "Search Prompt History",
          description: "Reverse-search all prompt history and copy a prompt to the clipboard",
          group: "History",
          bind: "ctrl+r",
          palette: true,
          slash: { name: "history-search", aliases: ["prompt-history", "hs"] },
          suggested: true,
          run: () => {
            void openHistoryDialog();
          },
        },
      ],
      bindings: ["history.search"],
    }));
    return null;
  } });

  },
});

export default tui;
