# Le bureau — the editorial desk as a Harness plugin

A DSH Web plugin that adds a **Le bureau** entry to the left sidebar and a main
panel for the editorial desk in `editorial/`. It keeps the simplified desk UI —
one column, three tabs, Inter — and runs the multi-agent pipeline **in-process**
instead of spawning `dsh --profile headless` once per action.

## What it does

- **The same three tabs as the desk.** Discussion, Recherche, Brouillon. The
  conversation is the control surface: the agent decides when to launch a stage
  with `desk_run` / `desk_loop`, writes `angle.md`, and reads the artefacts.
- **The same one-column page.** Left column: “+ Nouvel article”, the piece list,
  the agent status. Main column: title, source line, tabs, document. No
  dashboard, no workflow grid, no status pills.
- **The same face.** The panel loads the desk's own `InterVariable.woff2`
  (served at `/api/bureau/font`) and reuses its type scale, spacing and control
  sizes.
- **The same files.** `editorial/pieces/<slug>/…`, `editorial/sources/<id>/…`,
  and `src/content/blog/<slug>.mdx`. The CLI (`npm run desk`) keeps working;
  the plugin and the CLI share the same libraries.
- **In-process specialists.** Each role runs in an isolated child session via
  `ctx.subagents` (`provider: 'spawn'`), with the live GUI credentials. No CLI
  boot, no `DSH_BIN`, no headless credential patch. While a specialist works,
  its role and tool labels stream to the panel's progress line.
- **Stop and retry.** While a turn runs, *Arrêter* aborts the request: the host
  interrupts the conversation child and, through the tool signal, a specialist
  started by `desk_run`. *Relancer* re-sends the last user message after an
  error.
- **A durable conversation per piece.** The chat agent is a continuable child
  stored on the piece (`bureau_session_id`, `bureau_parent_id`). The next
  message resumes that session instead of replaying the bootstrap and the
  transcript; the desk CLI keeps its own `session_id`, so the two do not
  collide. If the child cannot be reached, the plugin falls back to one fresh
  child with a replayed context.
- **Agent tools.** `desk_run` and `desk_loop`, with the names and semantics the
  desk agent instructions already use.
- **Never publishes.** Like the desk: no commit, no post, no merge.

## Use

1. Open **Le bureau** in the left sidebar.
2. Press **+ Nouvel article**, pick one or more captures, add the intent.
3. Start the discussion; the first message sends the frozen sources, the
   intent and the charter.
4. Ask for a stage (“lance la recherche”, “fais le brief”, “écris le
   brouillon”, “lance les critiques”); the agent calls `desk_run` /
   `desk_loop` and the artefact appears in its tab.
5. Keep `draft: true` until you publish by hand.

## Requirements

- The workspace must contain `tools/desk/lib/` (the desk CLI and its libraries)
  and `tools/desk/ui/fonts/InterVariable.woff2`.
- `bookmark-digest` must be reachable to list or snapshot captured articles
  (`BOOKMARK_DIGEST_ROOT`, `BOOKMARK_DIGEST_DB`, `BOOKMARK_DIGEST_API`).
- At least one live chat session: the panel attaches its specialists to the
  most recent root agent, because a subagent needs a live parent. Without one,
  the sidebar status reads “agent : aucune session” and stage runs refuse.

## Endpoints

Same-origin only; requests without an `Origin` header are allowed for local
tooling.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/bureau/health` | Desk availability, piece count, default model, live sessions. |
| `GET` | `/api/bureau/font` | The desk's `InterVariable.woff2`. |
| `GET` | `/api/bureau/pieces` | Pieces, newest first. |
| `POST` | `/api/bureau/pieces` | Create a piece from `sourceIds` and `intent`. |
| `GET` | `/api/bureau/inbox?q=…` | Captured articles with coverage and reuse. |
| `GET` | `/api/bureau/pieces/:slug` | Piece, sources, messages, artefact presence. |
| `DELETE` | `/api/bureau/pieces/:slug` | Archive the piece. |
| `POST` | `/api/bureau/pieces/:slug/status` | Change the status. |
| `GET` | `/api/bureau/pieces/:slug/artifact?name=…` | `brief`, `research`, `draft`, `critiques`, `package`, `angle`. |
| `GET` | `/api/bureau/pieces/:slug/source?id=…` | Captured text of one source. |
| `POST` | `/api/bureau/pieces/:slug/chat` | NDJSON: `meta`, `delta`, `role`, `tool`, `done`, `error`. |
| `POST` | `/api/bureau/pieces/:slug/run` | NDJSON: `start`, `role`, `tool`, `done`, `error`. |
| `POST` | `/api/bureau/pieces/:slug/loop` | Same, for critique → revision. |

## Configuration

```yaml
- id: bureau
  name: '@local/bureau'
  config:
    # Defaults to the workspace that holds tools/desk.
    workspaceDir: ''
    # Characters of conversation replayed when a session has to be rebuilt.
    historyChars: 60000
    # Wall-clock cap for one specialist (0 disables it).
    stageTimeoutMinutes: 30
    # Wall-clock cap for one conversation turn, including a stage it launched.
    chatTimeoutMinutes: 45
    # Deterministic answers and artefacts, no model call.
    fake: false
```

## Fake mode and tests

Set `fake: true` to exercise the panel without a model: the chat answers
`(fake start) …` / `(fake continue) …`, and each stage writes a deterministic
artefact (research, brief, draft with `draft: true`, three critique scorecards,
revision, package). Nothing is sent to a provider and no subagent is started.

The route tests use the same mode against a temporary workspace:

```bash
npm run bureau:test
```

They copy `tools/desk/lib` and `editorial/agent|style` into a temp directory,
create a piece, and drive the real HTTP handler: health, pieces, chat
start/continue, the five stages, the artifact route, the critique/revision
loop, the session fallback, an unknown piece, and archive. Nothing touches the
real desk, and no token is spent.

## Limits

- The conversation child is owned by the session that started it. If that
  parent session is closed, or the child can no longer be resumed, the next
  message starts a fresh child and replays the bootstrap plus the last 24
  messages. Archiving a piece drains its child.
- A child activation settles when its turn ends; the next message cold-resumes
  the session from its log. The parent session then receives the harness's
  standard `subagent-settled` notice (a compact notice row, not a chat
  bubble).
- A specialist needs a live root Agent as its parent.
- The panel does not render the pipeline's tool transcripts; it shows the
  running role and the last tool label. Full transcripts are in the child
  session log.
- Timeouts are wall-clock caps, not inactivity timers: a specialist gets
  `stageTimeoutMinutes` (30 by default), a conversation turn gets
  `chatTimeoutMinutes` (45, so a stage launched from the chat is not strangled
  by the chat's own cap). `0` disables either. The CLI keeps its own
  `DESK_AGENT_TIMEOUT_MS`.
- `npm run desk` and the panel can be used on the same piece, but not at the
  same instant: both write the same files, and they keep separate model
  sessions.

## Files

- `index.js` — desk loading, HTTP routes, in-process specialists, `desk_run` /
  `desk_loop`.
- `client.js` — sidebar icon, main panel, React UI, locale dictionaries.
- `locale/en.json`, `locale/fr.json` — Plugin Manager title and description.
- `icon.svg` — original plugin artwork.
