# Le bureau — the editorial desk as a DSH bundle

A DeepSeek Harness plugin that opens **Le bureau** in the left sidebar and
replaces the local desk application with native DSH machinery. The blog
repository supplies only its **instruction files** and its data; the plugin
contains all the desk code.

## What it does

- **Pieces.** Create a piece from one or more captures, record the intent and
  the angle, follow its status, archive it.
- **Frozen sources.** Snapshot a capture into `editorial/sources/<id>/` with its
  coverage diagnosis, so a later deletion in the reading app does not remove
  the evidence.
- **Pipeline.** Five stages (`research`, `brief`, `draft`, `style`,
  `package`) and five specialist roles. Each role runs in an isolated DSH
  subagent, writes one artefact, and returns a three-sentence summary. `style`
  is an optional review of the draft against the writing examples; there is no
  thesis/steelman/structure critique.
- **Targeted fixes are not a stage.** The conversation can call `desk_fix`:
  a fixer edits the existing draft in place with `edit` (typos, accents,
  punctuation, spacing, repeated words, obvious agreement), writes a `fixes.md`
  report, and never rewrites the article. This avoids relaunching the writer
  for a comma.
- **The illustrator is not a stage either.** `desk_illustrate` searches
  licensed photos, can build a chart from already-sourced numbers, inserts the
  visual in the draft with `edit`, and writes `illustrations.md`. No cover image,
  no video and no generated image without an explicit request. Inserts go through
  the `Figure` component: full-width, uncropped, short caption, discreet source;
  the optional video uses `YoutubeEmbed` with the same caption/source treatment.
- **Publication is an explicit command, not a stage.** `desk_publish` without
  `confirm` runs a read-only preflight (checks, build, local images, git state);
  with `confirm: true` it sets `draft: false`, rechecks, commits only the article
  and its local assets, and pushes `master`. Cloudflare Pages deploys. The desk
  agent must show the preflight and wait for the user's explicit agreement before
  confirming.
- **One session per piece.** Each piece owns a normal DSH conversation whose
  system prompt is built from `editorial/agent/desk-agent.md`, the style card
  and the current dossier. **Open the discussion** creates or resumes that
  session in the current workspace, attaches it to the workspace, and starts it
  with a bootstrap message (piece, intent, frozen sources) so the agent begins
  instead of showing a blank session. A legacy session that is ungrouped or has
  no model selection is archived and replaced.
- **Instructions viewer.** The panel renders the desk agent, the seven roles,
  the style card, the register profile and the local exemplar file, read live
  from the repository.
- **Writing references are chosen by the LLM.** The preparer receives the full
  catalogue of local exemplars and writes two or three paths into the brief,
  varying them by piece and domain. The writer prompt inlines those full
  articles and keeps the rest of the catalogue as a “spill” list it can read on
  demand. The style review receives the same references.
- **Checks.** French typography, style tics and budgets, and proximity to the
  blog corpus, exposed both in the panel and through `desk_check`.
- **Skill.** The same instructions are published as the `bureau` DSH skill, so
  any agent can load them with the ordinary `skill` tool.

## Dependency on the blog

The only code dependency is **zero**: `lib/` never imports `tools/desk/`. The
plugin reads:

- `editorial/agent/desk-agent.md`
- `editorial/agent/roles/*.md` (seven roles)
- `editorial/style/card.md`, `editorial/style/newsroom-profile.md`
- `editorial/style/corpus/newsroom-exemplars.md` (short extracts; local and
  optional — the writer falls back to the profile if it is absent)
- and it writes the same data the desk CLI owns:
  `editorial/pieces/<slug>/…`, `editorial/sources/<id>/…`,
  `src/content/blog/<slug>.mdx`, `editorial/archive/<slug>/`.

`bookmark-digest` is read through `node:sqlite` or its REST API; when neither is
available the desk still opens and every operation except the capture inbox
works.

The preparer chooses the inline examples, prioritising FT/SCMP for news and
Le Monde diplomatique for analysis, and varying the choice from one piece to the
next. Le Monde and Libération remain language witnesses, not structural targets.
If a brief has no reference section, the writer falls back to a domain-matched
pair of full articles.

## DSH resources used

| Resource | Use |
|---|---|
| `ctx.tools` | `desk_status`, `desk_piece`, `desk_sources`, `desk_artifact`, `desk_angle`, `desk_instructions`, `desk_check`, `desk_run`, `desk_fix`, `desk_illustrate`, `desk_publish` |
| `ctx.subagents` | One isolated `spawn` activation per role, with cwd, timeout and the caller as parent |
| `ctx.agents` | One durable conversation per piece, created or resumed by the plugin |
| `ctx.systemPrompt` | Per-agent section with the desk agent instructions and the live dossier |
| `ctx.webServer` | Same-origin JSON API for the panel (`/api/bureau/...`) |
| Client `slots` | `main` panel and `sidebar.panellist` entry |
| `ctx.locale` | Panel dictionaries (English and French) |
| `ctx.skills` | Runtime `bureau` skill provider |
| `Config` | Workspace, bookmark paths, stage timeout, loop iterations |

## Use

1. Install the bundle through **Plugins** (or `plugin_manager`), then open
   **Le bureau** in the sidebar.
2. Press **+ Nouvelle pièce**, pick captures, add an intent, create the piece.
   With no title, the slug is dated (`piece-YYYY-MM-DD`) and the intent excerpt
   becomes the working title.
3. Press **Ouvrir la discussion**; the piece session is created in the current
   workspace and the agent immediately receives the piece, intent and sources.
   Ask for a stage in the conversation, or open **Pipeline** to run one.
4. Read the artefacts with the single **Document** selector; the angle, sources
   and checks are documents too. Open **Pipeline** only when you need to run or
   change a stage. Keep `draft: true` until you publish by hand.

## Typography and layout

The panel is deliberately quiet: one top bar, a narrow piece list, a document
column, and one **Document** selector. There are no tabs. The pipeline is hidden
behind the **Pipeline** button; the angle is one of the documents, never a block
above the draft. The draft frontmatter is stripped from the reading view.

Inter is bundled in `fonts/InterVariable.woff2` (SIL Open Font License, see
`fonts/OFL.txt`) and served by the plugin at `/api/bureau/font`; the panel falls
back to the system sans-serif stack if the font cannot load.

## Configuration

```yaml
- id: bureau
  name: '@local/bureau'
  config:
    workspaceDir: ''            # defaults to the live Session directory
    bookmarkRoot: ''            # defaults to ../bookmark-digest
    bookmarkDb: ''              # defaults to backend/data/bookmark-digest.db
    bookmarkApi: ''             # defaults to http://localhost:3001
    agentPreset: standard       # must provide read/write/edit and web tools
    stageTimeoutMinutes: 15     # 0 disables the cap
```

## Specialist tooling

Specialists run under `agentPreset` (default `standard`), not under the parent
session's minimal composition. That preset must provide `read`, `write`, `edit`,
`glob`/`grep` and the web tools; the writer needs `write`, the documentalist
needs web search/fetch. A profile without `standard` should set `agentPreset` to
another full-tool preset.

The desk tools are guarded against recursion: a specialist cannot call
`desk_run`, `desk_fix`, `desk_illustrate`, `desk_publish`, `desk_angle`, or the
write actions of `desk_piece` and `desk_sources`. It writes its artefact and
returns three sentences.

## Stopping a stage

While a stage runs in the conversation, the normal **Stop** control aborts the
`desk_run` / `desk_fix` / `desk_illustrate` call: the tool stops waiting and disposes the specialist
instead of holding the turn. A stage launched from **Pipeline** has its own
**Stop** button in the run banner (`POST /api/bureau/runs/<id>/cancel`).

The fallback cap is `stageTimeoutMinutes` (15 minutes by default; `0` disables
it). A partial artefact is left in place and can be inspected or overwritten by
rerunning the stage.

## Limits

- The desk never publishes, commits, merges, or modifies bookmark-digest.
- The full text of captures stays out of git (`editorial/sources/*/text.txt`).
- A stage needs its prerequisites: `sources` for research and brief, `brief`
  for draft, `draft` for style and package. The panel shows what is missing.
- If the piece session is archived or cannot be resumed, the next open creates
  a fresh session and records its id on the piece.
- The panel is a normal DSH page: the conversation itself opens in the central
  conversation panel, not inside this page.

## Tests

```bash
node --test plugins/bureau/test/
```

They use a temporary workspace and a fake specialist; no model is called.
