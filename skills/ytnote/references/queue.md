# Queue checks

The core runs `checks.mjs` at the start of every invocation and passes you `due` (rows whose
window has passed) and `size` (the store guard). This file says what to do with them.
Paths are relative to `<skill-dir>`.

If `size.overLimit` is true, tell the user once and offer to delete the captions raw files it
counts — never the transcribed ones, and never without asking. The command for that is
`node "<skill-dir>/scripts/remove.mjs" --all-captions-raw` (dry run first, `--yes` after the
user agrees; see `references/removing.md`).

- empty `due` array → nothing to do.
- otherwise, for each entry, look at its `reason`:
  - **`transcription`** → **do not fetch.** The video waits for a provider key, not for
    captions; a caption retry cannot help it. Report it and move on.
  - **`captions`** (or no reason) → retry the captions-only fetch. If segments appear:
    normalize, then `queue.mjs drop <videoId>`. If not: `queue.mjs bump <videoId>` (checks at
    +6 h, +24 h, +72 h, then `gaveUp: true` and it stops being retried) and report the next
    check time.

`due` is a time filter, so processing other videos in between costs nothing — nothing is
re-checked before its window has passed.

## Reporting the queue to the user

A queued video has no `meta.json` yet, so its title is not on disk. Resolve it before showing
the queue — a bare videoId tells the user nothing about what they are deciding on:

```
node "<skill-dir>/scripts/queue.mjs" titles
```

`queue.mjs` caches the resolved `title`, `author` and `uploadDate` in `_queue.json` on the
first lookup, so later invocations cost no network. Rows added before that cache existed are
resolved once and then cached too.

One JSON entry per waiting video: `videoId`, `title`, `author`, `uploadDate`, `reason`,
`attempts`, `nextCheckAt`, `gaveUp`. Render it as a table and lead with the count — "2 videos
waiting":

| videoId | title | uploaded | waiting for | attempts | next check |
|---|---|---|---|---|---|
| `AQavE0b-jNs` | Jan Pivec vzpomíná (TV film) — RETRO SHOW OK3 | 2021-03-18 | captions | 2 | 2026-10-23 |

`reason` says what the video waits for: **captions** (YouTube has not generated them yet) or
**transcription** (it needs a provider key — see `references/transcription.md`). Say it in the
table, because the two need different actions from the user: one is time, the other is a
credential.

`nextCheckAt` is unix ms — render it as a date. The upload date is best effort ("unknown" when
YouTube does not say). The title is the point: the user decides from it whether to keep
waiting, drop the video, or transcribe it. Mark entries with `gaveUp: true` as no longer
retried.

If the client can schedule work (cron, wake-up, queued task), offer to schedule a one-shot
check for the entry's `nextCheckAt` (visible in `queue.mjs list`). Treat that as a bonus, not a
requirement: without a scheduler, the next manual invocation picks the video up.

Never use `--audio` for a queue check — retries must stay free and silent.

Do not retry an entry that is not due, even if the user asks — say when it will be checked.
