# Tweet studio

A DSH Web plugin that adds a **Tweet studio** entry to the left sidebar and a
dedicated main panel for drafting Bluesky and X posts from the blog's captured
articles.

## What it does

- **Grounds the draft in a source.** Searches the bookmark digest with
  `tools/desk/cli.mjs find` and reads the captured text from
  `editorial/sources/<id>/text.txt`.
- **Follows the real skill.** Reads `.agents/skills/tweet/SKILL.md` at request
  time, so editing the skill changes the studio's voice without touching the
  plugin.
- **Respects the platform.** Bluesky defaults to 300 characters and X to 280;
  the host returns both limits so the UI counts and warns per post.
- **Supports a thread only on request.** The thread toggle is explicit, with a
  3–5 post length; the prompt separates posts with `---` and strips numbering.
- **Keeps a local shelf.** Recent drafts live in `localStorage`; nothing is
  published anywhere.
- **Hands off to a full agent.** “Open in chat” opens a new session with the
  same brief prefilled, so the tweet skill and all agent tools remain available.
- **Gives the agent the same operation.** Registers a `tweet_studio` model tool
  that resolves a source, writes the post, and returns the text and counts.

## Use

1. Open **Tweet studio** in the left sidebar.
2. Pick a platform and a format.
3. Search for a captured article, or write the point directly.
4. Press **Draft with the tweet skill** (`⌘/Ctrl + Enter`).
5. Edit, refine, copy, save, or open the brief in a chat.

## Configuration

The bundle inserts one `tweet-studio` row. Its optional config is read directly:

```yaml
- id: tweet-studio
  name: '@local/tweet-studio'
  config:
    # Defaults to the current Session working directory.
    workspaceDir: ''
    # Empty provider/model/reasoningEffort use the app default model.
    provider: ''
    model: ''
    reasoningEffort: ''
    temperature: 0.7
    maxTokens: 2000
    sourceChars: 14000
    maxResults: 8
    blueskyLimit: 300
    twitterLimit: 280
```

## Host endpoints

Same-origin only; requests without an `Origin` header are allowed for local
tooling. The web server binds to loopback by default.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/tweet-studio/health` | Limits, model, skill and desk availability. |
| `GET` | `/api/tweet-studio/find?q=…` | `desk find` results with title, site, words, coverage, text path, URL. |
| `GET` | `/api/tweet-studio/source?path=…` | Captured text inside `editorial/sources/` only. |
| `POST` | `/api/tweet-studio/generate` | NDJSON stream: `meta`, `delta`, `done`, `error`. |

## Files

- `index.js` — host routes, source lookup, prompt, model stream, model tool.
- `client.js` — sidebar icon, main panel, React UI, locale dictionaries.
- `locale/en.json`, `locale/fr.json` — Plugin Manager title and description.
- `icon.svg` — original plugin artwork.
