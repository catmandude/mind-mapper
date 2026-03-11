# LynxNote Sample Items for Quick Add

---

## Shell Commands

### Find large files in current directory
**Type:** shell
**Tags:** disk, cleanup, find
```bash
find . -type f -size +100M -exec ls -lh {} \; | sort -k5 -h
```

---

### Kill process on a specific port
**Type:** shell
**Tags:** network, port, kill
```bash
lsof -ti :3000 | xargs kill -9
```

---

### Search git history for deleted file
**Type:** shell
**Tags:** git, history, recovery
```bash
git log --all --full-history -- "**/filename.ext"
```

---

### Recursively replace text in files
**Type:** shell
**Tags:** sed, refactor, bulk-edit
```bash
grep -rl 'oldString' ./src | xargs sed -i '' 's/oldString/newString/g'
```

---

### Docker: remove all stopped containers and dangling images
**Type:** shell
**Tags:** docker, cleanup
```bash
docker system prune -af --volumes
```

---

### SSH tunnel to remote database
**Type:** shell
**Tags:** ssh, tunnel, database, postgres
```bash
ssh -L 5432:localhost:5432 user@remote-host -N
```

---

### List all listening ports on macOS
**Type:** shell
**Tags:** network, macos, debug
```bash
sudo lsof -iTCP -sTCP:LISTEN -n -P
```

---

### Tar and gzip a directory
**Type:** shell
**Tags:** archive, tar, backup
```bash
tar -czf archive-$(date +%Y%m%d).tar.gz ./target-directory
```

---

### Watch a command repeatedly (macOS)
**Type:** shell
**Tags:** watch, monitoring, macos
```bash
while true; do clear; date; echo "---"; kubectl get pods; sleep 5; done
```

---

### Git interactive rebase last N commits
**Type:** shell
**Tags:** git, rebase, history
```bash
git rebase -i HEAD~5
```

---

## Code Snippets

### TypeScript: debounce function
**Type:** snippet
**Tags:** typescript, debounce, utility
```typescript
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
```

---

### Rust: read file to string with error handling
**Type:** snippet
**Tags:** rust, file-io, error-handling
```rust
use std::fs;
use std::path::Path;

fn read_file(path: &Path) -> Result<String, Box<dyn std::error::Error>> {
    let contents = fs::read_to_string(path)?;
    Ok(contents)
}
```

---

### Python: flatten nested list
**Type:** snippet
**Tags:** python, list, utility
```python
def flatten(lst):
    return [item for sublist in lst for item in
            (flatten(sublist) if isinstance(sublist, list) else [sublist])]
```

---

### SQL: find duplicate rows
**Type:** snippet
**Tags:** sql, duplicates, debugging
```sql
SELECT email, COUNT(*) as cnt
FROM users
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
```

---

### React: custom hook for localStorage
**Type:** snippet
**Tags:** react, hooks, localstorage
```typescript
import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initial;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

---

### CSS: truncate text with ellipsis (multiline)
**Type:** snippet
**Tags:** css, text, overflow, ellipsis
```css
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

---

### Bash: retry a command with backoff
**Type:** snippet
**Tags:** bash, retry, resilience
```bash
retry() {
  local max=5 delay=1
  for i in $(seq 1 $max); do
    "$@" && return 0
    echo "Attempt $i failed. Retrying in ${delay}s..."
    sleep $delay
    delay=$((delay * 2))
  done
  return 1
}
```

---

### Go: simple HTTP health check endpoint
**Type:** snippet
**Tags:** go, http, health-check
```go
http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"ok"}`))
})
```

---

## Config Files

### Prettier config (strict)
**Type:** config
**Tags:** prettier, formatting, javascript
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

---

### ESLint flat config (TypeScript)
**Type:** config
**Tags:** eslint, typescript, linting
```javascript
import tseslint from 'typescript-eslint';

export default tseslint.config(
  tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
```

---

### Nginx reverse proxy with WebSocket support
**Type:** config
**Tags:** nginx, reverse-proxy, websocket
```nginx
server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### GitHub Actions: Rust CI
**Type:** config
**Tags:** github-actions, ci, rust
```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo fmt --check
      - run: cargo clippy -- -D warnings
      - run: cargo test
```

---

### Dockerfile: multi-stage Node.js build
**Type:** config
**Tags:** docker, node, multi-stage
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## Notes

### macOS keyboard shortcuts I always forget
**Type:** note
**Tags:** macos, shortcuts, reference
- **Cmd+Shift+.** — Show/hide hidden files in Finder
- **Cmd+Option+Esc** — Force quit dialog
- **Ctrl+Cmd+Space** — Emoji picker
- **Cmd+Shift+4, then Space** — Screenshot a single window
- **Cmd+Option+D** — Toggle dock auto-hide

---

### Git commit message conventions
**Type:** note
**Tags:** git, conventions, team
Prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

Body should explain **why**, not **what**. The diff shows what changed.

Breaking changes: add `BREAKING CHANGE:` footer or `!` after type.

Example:
```
feat(auth): add OAuth2 PKCE flow for mobile clients

Desktop clients were using implicit grant which is deprecated.
PKCE provides better security for public clients.
```

---

### PostgreSQL useful queries
**Type:** note
**Tags:** postgres, database, admin
- **Active connections:** `SELECT * FROM pg_stat_activity WHERE state = 'active';`
- **Table sizes:** `SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;`
- **Kill a query:** `SELECT pg_terminate_backend(pid);`
- **Current locks:** `SELECT * FROM pg_locks WHERE NOT granted;`

---

### HTTP status codes quick reference
**Type:** note
**Tags:** http, api, reference
- **200** OK — **201** Created — **204** No Content
- **301** Moved Permanently — **304** Not Modified
- **400** Bad Request — **401** Unauthorized — **403** Forbidden — **404** Not Found — **409** Conflict — **422** Unprocessable Entity — **429** Too Many Requests
- **500** Internal Server Error — **502** Bad Gateway — **503** Service Unavailable

---

### Regex patterns I keep looking up
**Type:** note
**Tags:** regex, reference, patterns
- **Email (basic):** `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- **UUID v4:** `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`
- **ISO date:** `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`
- **Semantic version:** `^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[\w.]+)?(\+[\w.]+)?$`
- **IPv4:** `^((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d)$`

---

### Tauri v2 IPC gotchas
**Type:** note
**Tags:** tauri, rust, ipc, debugging
1. All command return types must implement `serde::Serialize`
2. Command errors must be `String` or implement `Into<InvokeError>`
3. State params use `State<'_, AppState>` — lifetime required
4. Async commands need `#[tauri::command(async)]` if they do blocking IO
5. Frontend `invoke()` returns a Promise — always handle the error case
6. Commands must be registered in `Builder::invoke_handler(generate_handler![...])`
