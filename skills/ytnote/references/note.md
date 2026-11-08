# Writing `note.md`

Loaded when a note is written or shown — the default for a URL. Paths are relative to
`<skill-dir>`; the core rules live in `SKILL.md`.

## Analysis — note.md

Write `<root>/<videoId>/note.md` in the user's language. It is the first thing the user reads:
URL, duration, the original title, a short summary, and the few moments worth jumping to.
It is the only analysis artifact — no parallel JSON, no second file, no frontmatter (the
machine data already lives in `meta.json`). Read `transcript.md` in full; if it is too large
for one read, read it in sequential chunks — never sample.

```markdown
# <title exactly as in meta.json>

<https://youtu.be/<id>> · <h:mm:ss> · <transcript source> · published <YYYY-MM-DD>

**Summary** — 3–4 sentences: what the video is, who speaks, what it concludes.

## Key moments

- what was said and why it matters. [08:12](https://youtu.be/<id>?t=492)

- the next moment. [12:40](https://youtu.be/<id>?t=754)
```

The template above is English; write the file in the user's language and translate the fixed
parts (heading, labels) accordingly.

Rules:

- 3–5 moments is the usual size, not a cap. A video listing ten principles gets ten points;
  never pad a three-point video to five and never squash ten into three. Each point must be
  something the user would actually jump to.
- The note records what the video claims, as of its publish date. It is not verification: if
  the user plans to act on it later (an offer, a free tier, a price), check the source again
  before relying on it.
- Every moment is one bullet: the text first, then the timestamp as a link in square brackets at
  the end (`[08:12](https://youtu.be/<id>?t=492)`), with one blank line between bullets so the
  list does not read as a wall. No numbering, no separate link line. The link target is
  `startMs / 1000`, rounded down, as plain seconds (`?t=754`).
- The source on the meta line comes from `meta.json.transcriptKind`: `captions` →
  "YouTube captions", `transcribed` → "transcribed from audio" (add `transcriptionProvider`
  when it is set) — in the user's language. Never call them author-made — the output does not
  say who uploaded them.
  The date comes from `meta.json` (`publishedAt`, date only); if it is missing, write
  "published unknown" instead of guessing.
- The file keeps the absolute date only: a stored "5 weeks ago" would be wrong when read next
  year. In chat, show the live age next to it — "published 2026-09-14 (5 weeks ago)" — computed
  from today's date as the client reports it, with correct plural forms for the user's
  language. If today's date is unavailable, read it from the shell; never guess.
- Facts come from the transcript only. No outside knowledge, no guessed names, no timestamps
  that are not in the file. Auto-captions mangle names (`n8n` → "N A10"): keep what you hear
  and mark it with `(?)` instead of inventing the correct spelling.
- If the transcript is visibly garbled or incomplete, add one closing sentence saying what to
  verify. Otherwise stop there.
- If `note.md` already exists, show it instead of regenerating. Regenerate only when asked,
  and say that it overwrites the file.
- If the user wants what came out of a discussion about the video kept, write
  `<root>/<videoId>/discussion.md` in their language: the conclusions and open questions, not a
  transcript of the chat, and attribute what is opinion. Never merge it into `note.md` — that
  file stays what the video claims. Write it only when asked.

In chat, render the note as written — heading, link line, summary, numbered moments — and add
the local path at the end. Do not reformat it into a table and do not re-summarize the summary.
A table is fine only for a library listing across several videos (title, duration, note yes/no).
