# MindMapper

A developer knowledge base desktop app built with Tauri v2. Replaces Apple Notes with instant search, markdown-backed storage, and AI-powered auto-categorization.

## Features

- Full-text search with FTS5 and BM25 ranking
- Global hotkey search overlay (Cmd+Shift+Space)
- Markdown files as source of truth with YAML frontmatter
- SQLite-derived index with automatic reconciliation
- File watcher syncs external edits in real time
- AI auto-categorization on save (OpenAI, Claude, Ollama)
- Code editor with syntax highlighting (CodeMirror)
- System tray with background operation
- Clipboard integration for quick copy

## Tech Stack

- **Desktop**: Tauri v2 (Rust)
- **Frontend**: React 19, TypeScript, Vite 7, Mantine UI
- **Storage**: Markdown files + SQLite FTS5
- **AI**: OpenAI, Claude, Ollama (pluggable providers)

## Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- macOS (primary target)

## Development

```bash
# Install frontend dependencies
npm install

# Run in development mode
export PATH="$HOME/.cargo/bin:$PATH"
cargo tauri dev
```

## Build

```bash
export PATH="$HOME/.cargo/bin:$PATH"
cargo tauri build
```

Produces:
- `src-tauri/target/release/bundle/macos/MindMapper.app`
- `src-tauri/target/release/bundle/dmg/MindMapper_0.1.0_aarch64.dmg`

## Project Structure

```
src/                        # React frontend
  components/
    editor/                 # Item list and form
    search/                 # Search overlay window
    settings/               # AI settings panel
    sidebar/                # Folder/tag/type navigation
  hooks/                    # TanStack Query hooks
  lib/                      # Tauri command wrappers
  types/                    # TypeScript interfaces

src-tauri/                  # Rust backend
  src/
    ai/                     # AI provider trait + implementations
      provider.rs           # AiProvider trait, AiConfig, AiMessage
      openai.rs             # OpenAI API integration
      claude.rs             # Anthropic Claude API integration
      ollama.rs             # Ollama local model integration
      categorize.rs         # Prompt builder, response parser, factory
    commands/               # Tauri IPC command handlers
      snippets.rs           # CRUD + async AI enrichment
      search.rs             # Full-text search
      settings.rs           # Key-value settings
      ai.rs                 # AI settings management
    db/                     # SQLite schema and queries
    files/                  # Markdown I/O, file watcher, sync
    state.rs                # Shared app state (DB, data dir, AI provider)
    lib.rs                  # Tauri app setup and plugin registration
```

## Data Locations

| What | Path |
|------|------|
| Markdown files | `~/Documents/MindMapper/` |
| SQLite database | `~/Library/Application Support/com.austinmiller.mind-mapper/mind-mapper.db` |
| AI settings | Stored in the `settings` table in SQLite |

## AI Auto-Categorization

When saving an item, if fields like type, language, tags, folder, or description are left empty, MindMapper can automatically fill them using AI. The item saves immediately and enrichment happens asynchronously in the background.

### Setup

1. Open Settings (gear icon in the top bar)
2. Select a provider (OpenAI, Claude, or Ollama)
3. Enter your API key (not needed for Ollama)
4. Optionally set a model and base URL
5. Save

### Supported Providers

| Provider | Default Model | Requires API Key | Default Base URL |
|----------|--------------|-------------------|-----------------|
| OpenAI | gpt-4o-mini | Yes | https://api.openai.com |
| Claude | claude-sonnet-4-20250514 | Yes | https://api.anthropic.com |
| Ollama | llama3.2 | No | http://localhost:11434 |

API keys are stored in the Rust backend database and are never exposed to the frontend webview.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
