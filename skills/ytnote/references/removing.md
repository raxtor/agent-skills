# Removing a video

Loaded when the user asks to delete a video or raw files, or when `checks.mjs` reports
`overLimit`. Paths are relative to `<skill-dir>`.

The store belongs to the user, so a video can be deleted — but only when they ask for it, and
never as a side effect of another task. One script does all of it, so this is never a hand-made
`rm -rf` or PowerShell `Remove-Item`:

```
node "<skill-dir>/scripts/remove.mjs" <videoId> [<videoId> ...] [--yes] [--raw-only] [--include-paid-raw]
node "<skill-dir>/scripts/remove.mjs" --all-captions-raw [--yes]
```

- **Dry run by default.** Without `--yes` it prints what it would delete and how much space that
  frees, and deletes nothing. Run it, show the plan, and only then run it again with `--yes`
  once the user confirms. Never put `--yes` on the first call.
- **A captions video is cheap to drop.** Transcript, meta, note and raw file go; `fetch.mjs`
  rebuilds the transcript for free. The note does not come back — say so.
- **A transcribed video is not.** With `transcriptKind: transcribed` the `extract.raw.json` is
  the only copy of audio that was paid for, so the script refuses the target and names the flag
  that overrides it (`--include-paid-raw`). Ask before using that flag; never assume it.
- `--raw-only` keeps the transcript and the note and drops just the raw JSON — the cleanup
  `checks.mjs` suggests when the store is over its limit. It respects the paid-raw rule too.
- `--all-captions-raw` sweeps every captions raw file in the store and skips transcribed ones
  unconditionally. That is what to offer when `checks.mjs` reports `overLimit`.
- Removing a video also drops a pending queue row for it. `queue.mjs drop` alone only forgets
  the queue entry and leaves the archive on disk; the two stay separate on purpose
  (`references/queue.md`).

Report the id, what was removed and the space freed. If the script refuses a target, say why —
a refusal is the paid-raw guard, not a failure.
