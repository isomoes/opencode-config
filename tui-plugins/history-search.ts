import type { TuiPlugin } from "@opencode-ai/plugin/tui";
// Resolved at runtime to the HOST's solid-js instance by opencode's TUI
// plugin loader (@opentui/solid runtime-plugin-support), so signals created
// here integrate with the TUI's reactive rendering.
import { createSignal } from "solid-js";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * TUI Prompt History Search Plugin
 *
 * Implements https://github.com/anomalyco/opencode/issues/5062 as a TUI
 * plugin (reverse-i-search): press ctrl+r (or run "Search Prompt History"
 * from the command palette / "/history-search") to open an in-TUI select
 * dialog over ALL prompts ever sent — every project, every session. Typing
 * in the dialog filters live; selecting an entry inserts it into the prompt
 * editor without sending it.
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
 * Registered in tui.json:  "plugin": ["./tui-plugins/history-search.ts"]
 * Requires "session_rename": "none" in tui.json keybinds to free ctrl+r.
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
const VISIBLE_LIMIT = 100;
/** Per-entry cap on the searchable text (keeps keystroke scans bounded). */
const SEARCH_TEXT_CHARS = 4_000;

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

// ---------------------------------------------------------------------------
// Search index
// ---------------------------------------------------------------------------

interface IndexedOption {
  /** DialogSelect option value: a short string, NOT the entry object. The
   * dialog runs isDeepEqual(option.value, selected) per rendered option on
   * every move/mouse event — deep-comparing multi-KB prompt objects there
   * was a major source of input lag. */
  id: string;
  title: string;
  description: string;
  /** Lowercased full prompt + directory + date, capped. Unlike the dialog's
   * built-in filter (title-only), this searches the entire prompt text. */
  searchText: string;
}

/** All query tokens must be substrings (fzf --exact style, AND semantics). */
function searchIndex(index: IndexedOption[], query: string): IndexedOption[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return index.slice(0, VISIBLE_LIMIT);
  const matches: IndexedOption[] = [];
  for (const item of index) {
    let ok = true;
    for (const token of tokens) {
      if (!item.searchText.includes(token)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      matches.push(item);
      if (matches.length >= VISIBLE_LIMIT) break; // entries are newest-first
    }
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const tui: TuiPlugin = async (api) => {
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
        searchText: `${entry.prompt.slice(0, SEARCH_TEXT_CHARS)}\n${description}`.toLowerCase(),
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
      api.ui.toast({ variant: "warning", message: "No prompt history found" });
      return;
    }
    // Snapshot for this dialog instance; background refreshes apply next open.
    const snapshotIndex = index;
    const snapshotById = byId;
    const toOption = (item: IndexedOption) => ({ title: item.title, description: item.description, value: item.id });
    // Host-solid signal: `get options()` below makes the dialog re-render
    // with our own search results while we cap what is actually rendered.
    const [visible, setVisible] = createSignal(searchIndex(snapshotIndex, "").map(toOption));
    api.ui.dialog.replace(() =>
      api.ui.DialogSelect<string>({
        title: "Prompt History",
        placeholder: `Filter ${snapshotIndex.length} prompts…`,
        get options() {
          return visible();
        },
        skipFilter: true, // we filter; the dialog only renders
        onFilter: (query) => setVisible(searchIndex(snapshotIndex, query).map(toOption)),
        onSelect: (option) => {
          api.ui.dialog.clear();
          const entry = snapshotById.get(option.value);
          if (entry) void insertPrompt(entry.prompt);
        },
      }),
    );
  };

  const insertPrompt = async (text: string) => {
    if (!text) return;
    try {
      await api.client.tui.appendPrompt({
        directory: api.state.path.directory,
        workspace: (api as any).workspace?.current?.(),
        text,
      });
      api.ui.toast({ variant: "success", message: "Prompt inserted from history" });
    } catch (error) {
      api.ui.toast({
        variant: "error",
        message: error instanceof Error ? error.message : "Failed to insert prompt",
      });
    }
  };

  const unregister = api.keymap.registerLayer({
    priority: 100,
    commands: [
      {
        namespace: "palette",
        name: "history.search",
        title: "Search Prompt History",
        desc: "Reverse-search all prompt history and insert into the prompt editor",
        category: "History",
        suggested: true,
        slashName: "history-search",
        slashAliases: ["prompt-history", "hs"],
        run() {
          void openHistoryDialog();
        },
      },
    ],
    bindings: [{ key: "ctrl+r", cmd: "history.search", desc: "Search prompt history", preventDefault: true }],
  } as any);

  if (typeof unregister === "function") api.lifecycle.onDispose(unregister);
};

export default {
  id: PLUGIN_ID,
  tui,
};
