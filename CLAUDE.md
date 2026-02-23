# MindMapper

Developer knowledge base desktop app replacing Apple Notes. Instant search for commands, configs, and snippets.

## Tech Stack

- **Desktop**: Tauri v2 (Rust backend, WebView frontend)
- **Frontend**: React 19 + TypeScript + Vite 7 + Mantine UI 8
- **Storage**: Markdown files (source of truth in `~/Documents/MindMapper/`) + SQLite FTS5 (derived index)
- **Graph**: Sigma.js + Graphology (WebGL-rendered force-directed graph view)
- **AI**: Pluggable providers (OpenAI, Claude, Ollama) — trait defined, implementations started

## Build & Run

```bash
export PATH="$HOME/.cargo/bin:$PATH"
cargo tauri dev        # development (hot-reload frontend + Rust backend)
cargo tauri build      # production (.app + .dmg)
npx tsc --noEmit       # frontend type check only
npx vite build         # frontend build only
```

## Project Structure

```
src/                          # React frontend
  App.tsx                     # Main window: sidebar + list/graph toggle + modals
  search.tsx                  # Search overlay entry point (separate window)
  main.tsx                    # Main window entry point
  types/index.ts              # Item, CreateItemInput, UpdateItemInput, ItemType
  hooks/
    useItems.ts               # React Query hooks for CRUD
    useSearch.ts              # Search overlay hook
    useGraphData.ts           # useMemo wrapper for graph building
  lib/
    tauri-commands.ts         # Typed wrappers for Tauri invoke calls
    extract-keywords.ts       # tokenize() + overlapScore() for text similarity
    find-duplicates.ts        # Duplicate item detection
    graph-builder.ts          # Builds Graphology graph from Item[]
  components/
    editor/                   # ItemList, ItemForm, ItemViewer, QuickAdd, DuplicateWarning
    graph/                    # GraphView, GraphEvents, GraphLegend
    search/SearchOverlay.tsx  # Global hotkey search (Cmd+Shift+Space)
    sidebar/Sidebar.tsx       # Folder/tag/type filters
    settings/AISettings.tsx   # AI provider configuration

src-tauri/src/                # Rust backend
  lib.rs                      # App setup: DB init, file watcher, global shortcut, tray
  state.rs                    # AppState (Mutex<Connection>, data_dir)
  db/
    schema.rs                 # SQLite schema + FTS5 virtual table
    queries.rs                # CRUD queries
    mod.rs
  files/
    markdown.rs               # Markdown + YAML frontmatter parsing
    watcher.rs                # notify crate file watcher
    sync.rs                   # Startup reconciliation + change processing
    mod.rs
  commands/
    snippets.rs               # Tauri commands: create/update/delete/get/list items
    search.rs                 # search_items (FTS5 + BM25)
    settings.rs               # get/set_setting, get_data_dir
    ai.rs                     # get/set_ai_settings, AI provider management
    mod.rs
  ai/
    provider.rs               # AiProvider trait
    openai.rs, claude.rs, ollama.rs  # Provider implementations
    categorize.rs             # AI auto-categorization
    mod.rs
```

## Architecture

- **Two-window app**: main editor window + hidden search overlay (toggled via Cmd+Shift+Space)
- **Data flow**: Markdown files on disk → file watcher (notify crate) → SQLite FTS5 index → React Query
- **Startup reconciliation**: compares files on disk to DB, syncs additions/updates/removals
- **Item types**: `note`, `shell`, `snippet`, `config` — each with distinct color in graph view
- **Graph view**: nodes = items (colored by type, sized by tag count), edges = keyword overlap + shared tags

## Key Patterns

- Rust state is `AppState` with `Mutex<Connection>` — lock, query, drop
- All Tauri commands are in `src-tauri/src/commands/` and registered in `lib.rs`
- Frontend uses React Query (`useItems` hook) — mutations auto-invalidate queries
- File changes emit `items-changed` event from Rust, frontend listens and invalidates queries
- TypeScript strict mode enabled with `noUnusedLocals` and `noUnusedParameters`

## Data Paths

- Markdown files: `~/Documents/MindMapper/`
- SQLite DB: `~/Library/Application Support/com.austinmiller.mind-mapper/mind-mapper.db`
- App bundle: `src-tauri/target/release/bundle/macos/MindMapper.app`
